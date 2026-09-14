import { MailProviderError, type MailDriver, type SendTransactionalEmailInput, type SentTransactionalEmail } from "./types.ts";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_TIMEOUT_MS = 8_000;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new MailProviderError(`Missing server configuration: ${name}`, { retryable: false });
  }
  return value;
}

function classifyHttpStatus(status: number): { retryable: boolean; message: string } {
  if (status === 429 || status >= 500) {
    return { retryable: true, message: `Resend request failed (${status})` };
  }
  return { retryable: false, message: `Resend request rejected (${status})` };
}

export const resendMailDriver: MailDriver = {
  name: "resend",
  async send(input: SendTransactionalEmailInput): Promise<SentTransactionalEmail> {
    const apiKey = requiredEnv("MAIL_PROVIDER_API_KEY");
    const from = requiredEnv("MAIL_FROM");
    const replyToEnv = process.env["MAIL_REPLY_TO"]?.trim();
    const timeoutRaw = process.env["MAIL_PROVIDER_TIMEOUT_MS"]?.trim();
    const timeoutMs = timeoutRaw ? Number(timeoutRaw) : DEFAULT_TIMEOUT_MS;
    const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;

    if (!input.html || !input.text) {
      throw new MailProviderError("Resend driver requires rendered html and text bodies", { retryable: false });
    }

    const payload: Record<string, unknown> = {
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    };

    const replyTo = input.replyTo?.trim() || replyToEnv || "";
    if (replyTo) {
      payload["reply_to"] = replyTo;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (error) {
      const aborted =
        (error instanceof Error && error.name === "AbortError") ||
        (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError");
      throw new MailProviderError(aborted ? "Resend request timed out" : "Resend network failure", {
        retryable: true,
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status < 200 || response.status >= 300) {
      const classified = classifyHttpStatus(response.status);
      throw new MailProviderError(classified.message, {
        retryable: classified.retryable,
        statusCode: response.status,
      });
    }

    return {
      ...input,
      capturedAt: new Date().toISOString(),
      delivered: true,
    };
  },
};
