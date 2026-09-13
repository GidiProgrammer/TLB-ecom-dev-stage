import { sendTransactionalEmail } from "./adapter.ts";
import {
  MAIL_MAX_ATTEMPTS,
  subjectForTransactionalEmail,
} from "./policy.ts";
import {
  claimPendingTransactionalEmails,
  markOutboxAttemptFailed,
  markOutboxSent,
} from "./outbox.ts";
import type { SendTransactionalEmailInput, SentTransactionalEmail, TransactionalOutboxRow } from "./types.ts";

export type ProcessOutboxOptions = {
  limit?: number;
  now?: Date;
  send?: (input: SendTransactionalEmailInput) => Promise<SentTransactionalEmail>;
};

export type ProcessOutboxResult = {
  claimed: number;
  sent: number;
  retryScheduled: number;
  permanentlyFailed: number;
};

/**
 * Claim pending/stale outbox rows and run them through the mail adapter.
 * Not scheduled. Not imported from routes. Capture driver records; it does not send.
 */
export async function processTransactionalEmailOutbox(
  options: ProcessOutboxOptions = {},
): Promise<ProcessOutboxResult> {
  const now = options.now ?? new Date();
  const send = options.send ?? sendTransactionalEmail;
  const claimed = await claimPendingTransactionalEmails(options.limit ?? 10, { now });

  const result: ProcessOutboxResult = {
    claimed: claimed.length,
    sent: 0,
    retryScheduled: 0,
    permanentlyFailed: 0,
  };

  for (const row of claimed) {
    const outcome = await deliverClaimedRow(row, now, send);
    if (outcome === "sent") result.sent += 1;
    else if (outcome === "retry") result.retryScheduled += 1;
    else result.permanentlyFailed += 1;
  }

  return result;
}

function safeReplyTo(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || /[\r\n\0]/.test(trimmed)) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return undefined;
  return trimmed;
}

async function deliverClaimedRow(
  row: TransactionalOutboxRow,
  now: Date,
  send: (input: SendTransactionalEmailInput) => Promise<SentTransactionalEmail>,
): Promise<"sent" | "retry" | "permanent"> {
  try {
    const replyTo = safeReplyTo(row.payload["replyTo"]);
    await send({
      to: row.recipientEmail,
      ...(replyTo ? { replyTo } : {}),
      subject: subjectForTransactionalEmail(row.templateId, row.payload),
      templateId: row.templateId,
      data: row.payload,
      idempotencyKey: row.eventKey,
    });
    await markOutboxSent(row.id, now);
    return "sent";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const permanent = row.attemptCount >= MAIL_MAX_ATTEMPTS;
    await markOutboxAttemptFailed(row.id, {
      now,
      attemptCount: row.attemptCount,
      lastError: message,
      permanent,
    });
    console.error(
      `[transactional-email] delivery ${permanent ? "permanently failed" : "failed; retry scheduled"}:`,
      message,
    );
    return permanent ? "permanent" : "retry";
  }
}
