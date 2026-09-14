import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getCapturedEmails, resetCapturedEmails } from "./capture-driver.ts";
import { transactionalEventKey } from "./events.ts";
import {
  claimPendingInMemory,
  enqueueInMemory,
  listMemoryOutbox,
  resetMemoryOutbox,
} from "./outbox.ts";
import {
  MAIL_BACKOFF_BASE_MS,
  MAIL_MAX_ATTEMPTS,
  MAIL_STALE_SENDING_MS,
  backoffMsAfterAttempt,
  subjectForTransactionalEmail,
} from "./policy.ts";
import { processTransactionalEmailOutbox } from "./processor.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");

function enqueueSample(id = "ord-process-1", now = new Date("2026-09-12T21:00:00.000Z")) {
  return enqueueInMemory(
    {
      eventKey: transactionalEventKey("order.created", id),
      eventType: "order.created",
      entityType: "order",
      entityId: id,
      recipientEmail: "lab@example.test",
      templateId: "order-created",
      payload: { reference: "TLB-PROC-1", notice: "order_received" },
    },
    now,
  ).row;
}

beforeEach(() => {
  process.env["MAIL_OUTBOX_BACKEND"] = "memory";
  process.env["MAIL_DRIVER"] = "capture";
  resetMemoryOutbox();
  resetCapturedEmails();
});

afterEach(() => {
  resetMemoryOutbox();
  resetCapturedEmails();
});

describe("outbox processor", () => {
  test("pending event becomes sent with sent_at populated", async () => {
    enqueueSample();
    const t0 = new Date("2026-09-12T21:00:00.000Z");
    const result = await processTransactionalEmailOutbox({ now: t0 });

    assert.equal(result.claimed, 1);
    assert.equal(result.sent, 1);
    const row = listMemoryOutbox()[0];
    assert.equal(row?.deliveryStatus, "sent");
    assert.equal(row?.sentAt, t0.toISOString());
    assert.equal(row?.attemptCount, 1);
    assert.equal(row?.lastError, null);
    assert.equal(listMemoryOutbox().length, 1);
  });

  test("capture driver records recipient, subject, template, and payload without sending", async () => {
    enqueueSample();
    await processTransactionalEmailOutbox({ now: new Date("2026-09-12T21:00:00.000Z") });

    assert.equal(getCapturedEmails().length, 1);
    const captured = getCapturedEmails()[0];
    assert.equal(captured?.to, "lab@example.test");
    assert.equal(captured?.templateId, "order-created");
    assert.equal(captured?.subject, subjectForTransactionalEmail("order-created", { reference: "TLB-PROC-1" }));
    assert.deepEqual(captured?.data, { reference: "TLB-PROC-1", notice: "order_received" });
    assert.equal(captured?.idempotencyKey, transactionalEventKey("order.created", "ord-process-1"));
    assert.equal(captured?.delivered, false);
    assert.notEqual(process.env["MAIL_DRIVER"], "resend");
  });

  test("failed delivery schedules retry on the same row", async () => {
    enqueueSample();
    const t0 = new Date("2026-09-12T21:00:00.000Z");
    const result = await processTransactionalEmailOutbox({
      now: t0,
      send: async () => {
        throw new Error("provider timeout");
      },
    });

    assert.equal(result.retryScheduled, 1);
    assert.equal(result.sent, 0);
    const row = listMemoryOutbox()[0];
    assert.equal(listMemoryOutbox().length, 1);
    assert.equal(row?.deliveryStatus, "pending");
    assert.equal(row?.attemptCount, 1);
    assert.equal(row?.lastError, "provider timeout");
    assert.equal(row?.nextAttemptAt, new Date(t0.getTime() + backoffMsAfterAttempt(1)).toISOString());
    assert.equal(getCapturedEmails().length, 0);
  });

  test("event reaching max attempts is failed and not retried", async () => {
    const row = enqueueSample("ord-max");
    const t0 = new Date("2026-09-12T21:00:00.000Z");
    row.attemptCount = MAIL_MAX_ATTEMPTS - 1;
    row.nextAttemptAt = t0.toISOString();

    const result = await processTransactionalEmailOutbox({
      now: t0,
      send: async () => {
        throw new Error("still failing");
      },
    });

    assert.equal(result.permanentlyFailed, 1);
    const updated = listMemoryOutbox()[0];
    assert.equal(updated?.deliveryStatus, "failed");
    assert.equal(updated?.attemptCount, MAIL_MAX_ATTEMPTS);
    assert.equal(updated?.lastError, "still failing");

    const later = await processTransactionalEmailOutbox({
      now: new Date(t0.getTime() + 365 * 24 * 60 * 60 * 1000),
      send: async () => {
        throw new Error("should not run");
      },
    });
    assert.equal(later.claimed, 0);
    assert.equal(listMemoryOutbox().length, 1);
  });

  test("permanent provider errors fail the row without exhausting retries", async () => {
    const { MailProviderError } = await import("./types.ts");
    enqueueSample("ord-4xx");
    const result = await processTransactionalEmailOutbox({
      now: new Date("2026-09-12T21:00:00.000Z"),
      send: async () => {
        throw new MailProviderError("Resend request rejected (422)", { retryable: false, statusCode: 422 });
      },
    });
    assert.equal(result.permanentlyFailed, 1);
    assert.equal(listMemoryOutbox()[0]?.deliveryStatus, "failed");
  });

  test("backoff keeps a recently failed event ineligible until next_attempt_at", async () => {
    enqueueSample("ord-backoff");
    const t0 = new Date("2026-09-12T21:00:00.000Z");
    await processTransactionalEmailOutbox({
      now: t0,
      send: async () => {
        throw new Error("temp");
      },
    });

    const tooSoon = new Date(t0.getTime() + MAIL_BACKOFF_BASE_MS - 1);
    const skipped = claimPendingInMemory(10, { now: tooSoon });
    assert.equal(skipped.length, 0);

    const due = new Date(t0.getTime() + MAIL_BACKOFF_BASE_MS);
    const claimed = claimPendingInMemory(10, { now: due });
    assert.equal(claimed.length, 1);
    assert.equal(claimed[0]?.eventKey, transactionalEventKey("order.created", "ord-backoff"));
  });

  test("stale sending rows are recoverable; fresh sending rows are not", () => {
    const now = new Date("2026-09-12T21:20:00.000Z");
    const stale = enqueueSample("stale", now);
    const fresh = enqueueInMemory(
      {
        eventKey: transactionalEventKey("quote.created", "fresh"),
        eventType: "quote.created",
        entityType: "quote",
        entityId: "fresh",
        recipientEmail: "q@example.test",
        templateId: "quote-created",
        payload: { reference: "QT-1", notice: "quote_submitted" },
      },
      now,
    ).row;
    stale.deliveryStatus = "sending";
    stale.attemptCount = 1;
    stale.updatedAt = new Date(now.getTime() - MAIL_STALE_SENDING_MS).toISOString();

    fresh.deliveryStatus = "sending";
    fresh.attemptCount = 1;
    fresh.updatedAt = now.toISOString();

    const claimed = claimPendingInMemory(10, { now });
    assert.equal(claimed.length, 1);
    assert.equal(claimed[0]?.id, stale.id);
    assert.equal(fresh.deliveryStatus, "sending");
    assert.equal(fresh.attemptCount, 1);
  });

  test("two claim attempts cannot both take the same pending event", () => {
    enqueueSample("ord-race");
    const now = new Date("2026-09-12T21:00:00.000Z");
    const first = claimPendingInMemory(10, { now });
    const second = claimPendingInMemory(10, { now });
    assert.equal(first.length, 1);
    assert.equal(second.length, 0);
    assert.equal(listMemoryOutbox()[0]?.deliveryStatus, "sending");
  });
});

describe("processor security contract", () => {
  test("client/browser sources do not invoke the processor or outbox", () => {
    const clientFiles = [
      "src/routes/checkout.tsx",
      "src/routes/quote.tsx",
      "src/routes/contact.tsx",
      "src/routes/index.tsx",
      "src/integrations/supabase/client.ts",
    ];
    for (const rel of clientFiles) {
      const text = readFileSync(resolve(root, rel), "utf8");
      assert.equal(text.includes("processTransactionalEmailOutbox"), false, rel);
      assert.equal(text.includes("claim_transactional_email_outbox"), false, rel);
      assert.equal(text.includes("SUPABASE_SERVICE_ROLE_KEY"), false, rel);
      assert.equal(text.includes("MAIL_DRIVER"), false, rel);
    }

    const walk = (dir: string) => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name);
        if (name.isDirectory()) walk(p);
        else if (name.name.endsWith(".tsx") || name.name.endsWith(".ts")) {
          if (p.includes(`${join("src", "routes", "api")}`)) continue;
          const text = readFileSync(p, "utf8");
          assert.equal(text.includes("processTransactionalEmailOutbox"), false, p);
        }
      }
    };
    walk(resolve(root, "src/routes"));
  });

  test("phase 2B migration keeps RLS and service-role-only claim", () => {
    const sql = readFileSync(
      resolve(here, "../../../supabase/migrations/20260912210000_tlb_transactional_email_outbox_claim.sql"),
      "utf8",
    );
    assert.match(sql, /FOR UPDATE OF o SKIP LOCKED/);
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /FORCE ROW LEVEL SECURITY/);
    assert.match(sql, /REVOKE ALL ON TABLE public\.transactional_email_outbox FROM PUBLIC, anon, authenticated/);
    assert.match(sql, /REVOKE EXECUTE ON FUNCTION public\.claim_transactional_email_outbox/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.claim_transactional_email_outbox/);
    assert.doesNotMatch(sql, /CREATE POLICY/);
    assert.doesNotMatch(sql, /ALTER TABLE public\.notifications/);
  });
});
