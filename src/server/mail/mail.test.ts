import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  getCapturedEmails,
  resetCapturedEmails,
} from "./capture-driver.ts";
import { sendTransactionalEmail } from "./adapter.ts";
import { transactionalEventKey } from "./events.ts";
import { enqueueInMemory, listMemoryOutbox, resetMemoryOutbox } from "./outbox.ts";

const here = dirname(fileURLToPath(import.meta.url));

afterEach(() => {
  resetCapturedEmails();
  resetMemoryOutbox();
});

describe("capture mail driver", () => {
  test("never marks a message as delivered", async () => {
    const sent = await sendTransactionalEmail({
      to: "customer@example.test",
      subject: "Order received",
      templateId: "order.created",
      data: { reference: "TLB-1001" },
      idempotencyKey: "order.created:demo",
    });

    assert.equal(sent.delivered, false);
    assert.equal(getCapturedEmails().length, 1);
    assert.notEqual(process.env["MAIL_DRIVER"], "resend");
  });

  test("captures to, subject, templateId, data, and idempotencyKey", async () => {
    const input = {
      to: "lab@example.test",
      subject: "Your quote prices",
      templateId: "quote.quoted",
      data: { reference: "Q-22", quotedPrices: [{ sku: "HCl", unit: 12 }] },
      idempotencyKey: transactionalEventKey("quote.quoted", "quote-uuid"),
    };

    const sent = await sendTransactionalEmail(input);
    assert.equal(sent.to, input.to);
    assert.equal(sent.subject, input.subject);
    assert.equal(sent.templateId, input.templateId);
    assert.deepEqual(sent.data, input.data);
    assert.equal(sent.idempotencyKey, input.idempotencyKey);
  });
});

describe("outbox idempotency", () => {
  test("same event key does not create a duplicate pending row", () => {
    const input = {
      eventKey: transactionalEventKey("order.created", "ord-1"),
      eventType: "order.created",
      entityType: "order",
      entityId: "ord-1",
      recipientEmail: "a@example.test",
      templateId: "order.created",
      payload: { reference: "TLB-1" },
    };

    const first = enqueueInMemory(input);
    const second = enqueueInMemory(input);

    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(second.row.id, first.row.id);
    assert.equal(listMemoryOutbox().length, 1);
  });

  test("different event keys create distinct rows", () => {
    enqueueInMemory({
      eventKey: transactionalEventKey("quote.created", "q-1"),
      eventType: "quote.created",
      entityType: "quote",
      entityId: "q-1",
      recipientEmail: "a@example.test",
      templateId: "quote.created",
    });
    enqueueInMemory({
      eventKey: transactionalEventKey("quote.quoted", "q-1"),
      eventType: "quote.quoted",
      entityType: "quote",
      entityId: "q-1",
      recipientEmail: "a@example.test",
      templateId: "quote.quoted",
    });

    assert.equal(listMemoryOutbox().length, 2);
  });

  test("server enqueue path can create an outbox entry", () => {
    process.env["MAIL_OUTBOX_BACKEND"] = "memory";
    const result = enqueueInMemory({
      eventKey: transactionalEventKey("profile.approved", "p-1"),
      eventType: "profile.approved",
      entityType: "profile",
      entityId: "p-1",
      recipientEmail: "inst@example.test",
      templateId: "profile.approved",
      payload: { notice: "account_approval_only" },
    });
    assert.equal(result.created, true);
    assert.equal(result.row.deliveryStatus, "pending");
  });
});

describe("outbox security contract", () => {
  test("migration denies customer writes and does not reuse warehouse notifications", () => {
    const sql = readFileSync(
      resolve(here, "../../../supabase/migrations/20260912190000_tlb_transactional_email_outbox.sql"),
      "utf8",
    );

    assert.match(sql, /CREATE TABLE public\.transactional_email_outbox/);
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /FORCE ROW LEVEL SECURITY/);
    assert.match(
      sql,
      /REVOKE ALL ON TABLE public\.transactional_email_outbox FROM PUBLIC, anon, authenticated/,
    );
    assert.match(sql, /GRANT ALL ON TABLE public\.transactional_email_outbox TO service_role/);
    assert.doesNotMatch(sql, /CREATE POLICY[\s\S]*transactional_email_outbox/);
    assert.doesNotMatch(sql, /ALTER TABLE public\.notifications/);
    assert.doesNotMatch(sql, /GRANT .+ ON TABLE public\.notifications/);
  });

  test("client surfaces do not import the mail module or service-role secrets", () => {
    const root = resolve(here, "../../..");
    const clientGlobs = [
      "src/routes/contact.tsx",
      "src/routes/checkout.tsx",
      "src/routes/quote.tsx",
      "src/routes/index.tsx",
      "src/integrations/supabase/client.ts",
    ];
    for (const rel of clientGlobs) {
      const text = readFileSync(resolve(root, rel), "utf8");
      assert.equal(text.includes("src/server/mail"), false);
      assert.equal(text.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
      assert.equal(text.includes("VITE_RESEND"), false);
      assert.equal(text.includes("VITE_MAIL"), false);
      assert.equal(text.includes("service_role"), false);
      assert.equal(text.includes("CONTACT_RECIPIENT_EMAIL"), false);
    }
  });
});
