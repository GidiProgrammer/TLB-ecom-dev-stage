import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { getCapturedEmails, resetCapturedEmails } from "./capture-driver.ts";
import {
  enqueueOrderLifecycleFromTransition,
  enqueueQuoteLifecycleFromTransition,
  isStatusTransition,
  notifyAfterCommerceCommit,
  ORDER_CANCELLED_TEMPLATE_ID,
  ORDER_PAYMENT_FAILED_TEMPLATE_ID,
  ORDER_SHIPPED_TEMPLATE_ID,
  QUOTE_DECLINED_TEMPLATE_ID,
  QUOTE_QUOTED_TEMPLATE_ID,
} from "./commerce.ts";
import { transactionalEventKey } from "./events.ts";
import { listMemoryOutbox, resetMemoryOutbox } from "./outbox.ts";

const quoteBase = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  reference: "QT-20260913-READY",
  contactEmail: "quotes@example.test",
};

const orderBase = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  reference: "TLB-20260913-SHIP",
  shippingEmail: "lab@example.test",
};

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

describe("quote lifecycle transitions", () => {
  test("submitted → quoted enqueues exactly one quote.status:{id}:quoted", async () => {
    const first = await enqueueQuoteLifecycleFromTransition({
      ...quoteBase,
      previousStatus: "submitted",
      nextStatus: "quoted",
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.created, true);
    assert.equal(first.row.eventKey, transactionalEventKey("quote.quoted", quoteBase.id));
    assert.equal(first.row.eventKey, `quote.status:${quoteBase.id}:quoted`);
    assert.equal(first.row.templateId, QUOTE_QUOTED_TEMPLATE_ID);
    assert.equal(first.row.recipientEmail, "quotes@example.test");
    assert.equal(first.row.payload["reference"], quoteBase.reference);
    assert.equal(first.row.payload["notice"], "quote_ready");
    assert.equal("invoice" in first.row.payload, false);
    assert.equal("payment" in first.row.payload, false);
    assert.equal("order" in first.row.payload, false);
    assert.equal(listMemoryOutbox().length, 1);
  });

  test("submitted → declined enqueues exactly one quote.status:{id}:declined", async () => {
    const first = await enqueueQuoteLifecycleFromTransition({
      ...quoteBase,
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      previousStatus: "submitted",
      nextStatus: "declined",
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.row.eventKey, `quote.status:cccccccc-cccc-4ccc-8ccc-cccccccccccc:declined`);
    assert.equal(first.row.templateId, QUOTE_DECLINED_TEMPLATE_ID);
    assert.equal(first.row.payload["notice"], "quote_declined");
    assert.equal("reason" in first.row.payload, false);
  });

  test("repeated quoted transition does not create another row", async () => {
    const input = { ...quoteBase, previousStatus: "submitted", nextStatus: "quoted" as const };
    const first = await enqueueQuoteLifecycleFromTransition(input);
    const second = await enqueueQuoteLifecycleFromTransition(input);
    assert.equal(first.ok && first.created, true);
    assert.equal(second.ok && second.created, false);
    assert.equal(listMemoryOutbox().length, 1);
  });

  test("quoted → quoted is not a transition and does not enqueue", async () => {
    const result = await enqueueQuoteLifecycleFromTransition({
      ...quoteBase,
      previousStatus: "quoted",
      nextStatus: "quoted",
    });
    assert.equal(result.ok, false);
    assert.equal(listMemoryOutbox().length, 0);
    assert.equal(isStatusTransition("quoted", "quoted"), false);
  });

  test("repeated declined update does not create another row", async () => {
    const input = {
      ...quoteBase,
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      previousStatus: "reviewed",
      nextStatus: "declined" as const,
    };
    await enqueueQuoteLifecycleFromTransition(input);
    await enqueueQuoteLifecycleFromTransition(input);
    assert.equal(listMemoryOutbox().length, 1);
  });

  test("line-price-only status (still submitted) does not enqueue quoted", async () => {
    const result = await enqueueQuoteLifecycleFromTransition({
      ...quoteBase,
      previousStatus: "submitted",
      nextStatus: "submitted",
    });
    assert.equal(result.ok, false);
    assert.equal(listMemoryOutbox().length, 0);
  });
});

describe("order lifecycle transitions", () => {
  test("processing → shipped enqueues exactly one order.shipped:{id}", async () => {
    const first = await enqueueOrderLifecycleFromTransition({
      ...orderBase,
      previousStatus: "processing",
      nextStatus: "shipped",
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.row.eventKey, `order.shipped:${orderBase.id}`);
    assert.equal(first.row.templateId, ORDER_SHIPPED_TEMPLATE_ID);
    assert.equal(first.row.recipientEmail, "lab@example.test");
    assert.equal(first.row.payload["notice"], "order_shipped");
    assert.equal("waybill" in first.row.payload, false);
    assert.equal("warehouse" in first.row.payload, false);
  });

  test("processing → cancelled enqueues exactly one order.cancelled:{id}", async () => {
    const first = await enqueueOrderLifecycleFromTransition({
      ...orderBase,
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      previousStatus: "processing",
      nextStatus: "cancelled",
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.row.eventKey, "order.cancelled:eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee");
    assert.equal(first.row.templateId, ORDER_CANCELLED_TEMPLATE_ID);
    assert.equal(first.row.payload["notice"], "order_cancelled");
    assert.equal("refund" in first.row.payload, false);
  });

  test("processing → payment_failed enqueues exactly one order.payment_failed:{id}", async () => {
    const first = await enqueueOrderLifecycleFromTransition({
      ...orderBase,
      id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      previousStatus: "processing",
      nextStatus: "payment_failed",
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.row.eventKey, "order.payment_failed:ffffffff-ffff-4fff-8fff-ffffffffffff");
    assert.equal(first.row.templateId, ORDER_PAYMENT_FAILED_TEMPLATE_ID);
    assert.equal(first.row.payload["notice"], "payment_failed");
    assert.equal("attempted" in first.row.payload, false);
    assert.equal("amount" in first.row.payload, false);
    assert.equal("provider" in first.row.payload, false);
  });

  test("repeated shipped update does not duplicate the event", async () => {
    const input = { ...orderBase, previousStatus: "processing", nextStatus: "shipped" as const };
    await enqueueOrderLifecycleFromTransition(input);
    await enqueueOrderLifecycleFromTransition(input);
    assert.equal(listMemoryOutbox().length, 1);
  });

  test("shipped → shipped does not enqueue", async () => {
    const result = await enqueueOrderLifecycleFromTransition({
      ...orderBase,
      previousStatus: "shipped",
      nextStatus: "shipped",
    });
    assert.equal(result.ok, false);
    assert.equal(listMemoryOutbox().length, 0);
  });
});

describe("lifecycle enqueue failure does not imply mutation rollback", () => {
  test("status mutation result is returned even if enqueue throws", async () => {
    const mutation = { reference: "TLB-KEEP", status: "shipped" };
    const returned = await notifyAfterCommerceCommit(mutation, async () => {
      throw new Error("outbox unavailable");
    });
    assert.deepEqual(returned, mutation);
    assert.equal(listMemoryOutbox().length, 0);
    assert.equal(getCapturedEmails().length, 0);
  });

  test("event keys stay deterministic for the same entity", () => {
    assert.equal(
      transactionalEventKey("quote.quoted", quoteBase.id),
      `quote.status:${quoteBase.id}:quoted`,
    );
    assert.equal(
      transactionalEventKey("order.payment_failed", orderBase.id),
      `order.payment_failed:${orderBase.id}`,
    );
  });
});
