import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { orderStatusExplanation, orderStatusLabel } from "./account-display.ts";

describe("account status copy", () => {
  test("payment_failed is understandable without implying online payment", () => {
    assert.equal(orderStatusLabel("payment_failed"), "Needs attention");
    assert.match(orderStatusExplanation("payment_failed") ?? "", /contact TLB/i);
  });
});
