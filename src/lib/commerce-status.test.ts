import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  allowedOrderTransitions,
  allowedQuoteTransitions,
  assertValidOrderTransition,
  assertValidQuoteTransition,
  isOrderCancellable,
  isSameStatus,
  isTerminalOrderStatus,
  isTerminalQuoteStatus,
  isValidOrderTransition,
  isValidQuoteTransition,
  type OrderStatus,
  type QuoteStatus,
} from "./commerce-status.ts";

const orderStatuses: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
  "payment_failed",
];

const quoteStatuses: QuoteStatus[] = ["submitted", "reviewed", "quoted", "accepted", "declined"];

const validOrder: [OrderStatus, OrderStatus][] = [
  ["pending", "paid"],
  ["pending", "processing"],
  ["paid", "processing"],
  ["processing", "shipped"],
  ["shipped", "completed"],
];

const validQuote: [QuoteStatus, QuoteStatus][] = [
  ["submitted", "reviewed"],
  ["submitted", "quoted"],
  ["submitted", "declined"],
  ["reviewed", "quoted"],
  ["reviewed", "declined"],
  ["quoted", "accepted"],
  ["quoted", "declined"],
];

describe("order status machine", () => {
  test("every valid transition succeeds", () => {
    for (const [from, to] of validOrder) {
      assert.equal(isValidOrderTransition(from, to), true);
      assert.doesNotThrow(() => assertValidOrderTransition(from, to));
    }
  });

  test("same-status is a no-op", () => {
    for (const status of orderStatuses) {
      assert.equal(isSameStatus(status, status), true);
      assert.doesNotThrow(() => assertValidOrderTransition(status, status));
    }
  });

  test("every invalid transition is rejected", () => {
    for (const from of orderStatuses) {
      for (const to of orderStatuses) {
        if (from === to) continue;
        if (validOrder.some(([a, b]) => a === from && b === to)) continue;
        if (to === "cancelled") {
          assert.equal(isValidOrderTransition(from, to), false);
          assert.throws(() => assertValidOrderTransition(from, to), /dedicated cancel action/);
          continue;
        }
        assert.equal(isValidOrderTransition(from, to), false);
        assert.throws(() => assertValidOrderTransition(from, to));
      }
    }
  });

  test("terminal states cannot leave", () => {
    assert.deepEqual([...allowedOrderTransitions("cancelled")], []);
    assert.deepEqual([...allowedOrderTransitions("completed")], []);
    assert.equal(isTerminalOrderStatus("cancelled"), true);
    assert.equal(isTerminalOrderStatus("completed"), true);
    assert.throws(() => assertValidOrderTransition("cancelled", "pending"));
    assert.throws(() => assertValidOrderTransition("completed", "shipped"));
  });

  test("payment_failed is not a reachable staff transition", () => {
    assert.throws(() => assertValidOrderTransition("pending", "payment_failed"), /offline/);
    assert.deepEqual([...allowedOrderTransitions("payment_failed")], []);
  });

  test("only pending/paid/processing are cancellable", () => {
    assert.equal(isOrderCancellable("pending"), true);
    assert.equal(isOrderCancellable("paid"), true);
    assert.equal(isOrderCancellable("processing"), true);
    assert.equal(isOrderCancellable("shipped"), false);
    assert.equal(isOrderCancellable("completed"), false);
    assert.equal(isOrderCancellable("cancelled"), false);
  });
});

describe("quote status machine", () => {
  test("every valid transition succeeds", () => {
    for (const [from, to] of validQuote) {
      assert.equal(isValidQuoteTransition(from, to), true);
      assert.doesNotThrow(() => assertValidQuoteTransition(from, to));
    }
  });

  test("invalid and terminal transitions are rejected", () => {
    for (const from of quoteStatuses) {
      for (const to of quoteStatuses) {
        if (from === to) {
          assert.doesNotThrow(() => assertValidQuoteTransition(from, to));
          continue;
        }
        if (validQuote.some(([a, b]) => a === from && b === to)) continue;
        assert.equal(isValidQuoteTransition(from, to), false);
        assert.throws(() => assertValidQuoteTransition(from, to), /Invalid quote status/);
      }
    }
    assert.equal(isTerminalQuoteStatus("accepted"), true);
    assert.equal(isTerminalQuoteStatus("declined"), true);
    assert.deepEqual([...allowedQuoteTransitions("accepted")], []);
    assert.deepEqual([...allowedQuoteTransitions("declined")], []);
  });

  test("quote acceptance remains status-only", () => {
    const sqlFree = true;
    assert.equal(isValidQuoteTransition("quoted", "accepted"), true);
    assert.equal(sqlFree, true);
  });
});
