import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  orderStatusExplanation,
  orderStatusLabel,
  quoteLineEstimate,
  quoteQuotedTotal,
  quoteStatusExplanation,
  quoteStatusLabel,
} from "./account-display.ts";

describe("account status copy", () => {
  test("payment_failed is understandable without implying online payment", () => {
    assert.equal(orderStatusLabel("payment_failed"), "Needs attention");
    assert.match(orderStatusExplanation("payment_failed") ?? "", /contact TLB/i);
  });

  test("quote statuses have labels and explanations", () => {
    assert.equal(quoteStatusLabel("submitted"), "Submitted");
    assert.equal(quoteStatusLabel("reviewed"), "Under review");
    assert.equal(quoteStatusLabel("quoted"), "Price provided");
    assert.equal(quoteStatusLabel("accepted"), "Accepted");
    assert.equal(quoteStatusLabel("declined"), "Declined");
    assert.match(quoteStatusExplanation("submitted") ?? "", /received/i);
    assert.match(quoteStatusExplanation("reviewed") ?? "", /reviewing/i);
    assert.match(quoteStatusExplanation("quoted") ?? "", /not an invoice/i);
    assert.match(quoteStatusExplanation("accepted") ?? "", /does not create an order/i);
    assert.match(quoteStatusExplanation("declined") ?? "", /declined/i);
  });
});

describe("quote estimate totals", () => {
  test("line estimate is quantity times quoted unit price", () => {
    assert.equal(quoteLineEstimate(2, 10), 20);
    assert.equal(quoteLineEstimate(3, null), null);
  });

  test("quoted total is only returned when every line is priced", () => {
    assert.equal(
      quoteQuotedTotal([
        { quantity: 1, quoted_price: 10 },
        { quantity: 2, quoted_price: 5 },
      ]),
      20,
    );
    assert.equal(
      quoteQuotedTotal([
        { quantity: 1, quoted_price: 10 },
        { quantity: 2, quoted_price: null },
      ]),
      null,
    );
    assert.equal(quoteQuotedTotal([]), null);
  });
});
