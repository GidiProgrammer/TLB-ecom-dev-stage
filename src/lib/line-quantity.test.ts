import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { interpretLineQuantity } from "./line-quantity.ts";

describe("interpretLineQuantity", () => {
  test("empty, zero, and junk do not remove the line", () => {
    assert.deepEqual(interpretLineQuantity("", 2), { status: "unchanged" });
    assert.deepEqual(interpretLineQuantity("   ", 2), { status: "unchanged" });
    assert.deepEqual(interpretLineQuantity("0", 2), { status: "unchanged" });
    assert.deepEqual(interpretLineQuantity("-1", 2), { status: "unchanged" });
    assert.deepEqual(interpretLineQuantity("1.5", 2), { status: "unchanged" });
    assert.deepEqual(interpretLineQuantity("abc", 2), { status: "unchanged" });
  });

  test("a positive integer updates, including up to the stock cap", () => {
    assert.deepEqual(interpretLineQuantity("3", 2), { status: "update", quantity: 3 });
    assert.deepEqual(interpretLineQuantity(" 4 ", 1, 4), { status: "update", quantity: 4 });
    assert.deepEqual(interpretLineQuantity("2", 2, 4), { status: "unchanged" });
  });

  test("quantities above stock are rejected without a new quantity", () => {
    assert.deepEqual(interpretLineQuantity("9", 1, 4), { status: "too-high" });
  });
});
