import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  remainingPurchasableQty,
  stockLabel,
  stockStatus,
  unavailableReason,
} from "./catalog-stock.ts";

describe("stock language", () => {
  test("stockLabel uses a single out-of-stock phrase", () => {
    assert.equal(stockLabel(0), "Out of stock");
    assert.equal(stockStatus(0), "out-of-stock");
  });

  test("unavailableReason distinguishes catalogue vs cart consumption", () => {
    assert.equal(unavailableReason(0, 0), "out-of-stock");
    assert.equal(unavailableReason(4, 4), "in-cart");
    assert.equal(unavailableReason(4, 0), null);
  });

  test("remainingPurchasableQty does not go negative", () => {
    assert.equal(remainingPurchasableQty(3, 5), 0);
  });
});
