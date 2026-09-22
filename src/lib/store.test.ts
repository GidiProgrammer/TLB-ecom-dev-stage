import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseStoredCommerce, sanitizeCommerceLines } from "./store-storage.ts";

describe("stored commerce lines", () => {
  test("valid cart and quote lines survive unchanged", () => {
    const raw = JSON.stringify({
      cart: [{ id: "buffer-solution", qty: 2 }],
      quote: [{ id: "methanol", qty: 1 }],
    });
    assert.deepEqual(parseStoredCommerce(raw), {
      cart: [{ id: "buffer-solution", qty: 2 }],
      quote: [{ id: "methanol", qty: 1 }],
    });
  });

  test("non-array cart and quote become empty", () => {
    assert.deepEqual(sanitizeCommerceLines("cart"), []);
    assert.deepEqual(sanitizeCommerceLines(3), []);
    assert.deepEqual(sanitizeCommerceLines(null), []);
    assert.deepEqual(parseStoredCommerce(JSON.stringify({ cart: "nope", quote: { id: "x", qty: 1 } })), {
      cart: [],
      quote: [],
    });
  });

  test("invalid entries are removed and valid ones stay", () => {
    const lines = sanitizeCommerceLines([
      { id: "buffer-solution", qty: 2 },
      null,
      undefined,
      "line",
      4,
      { qty: 1 },
      { id: "", qty: 1 },
      { id: "   ", qty: 1 },
      { id: 12, qty: 1 },
      { id: "zero", qty: 0 },
      { id: "negative", qty: -2 },
      { id: "decimal", qty: 1.5 },
      { id: "nan", qty: Number.NaN },
      { id: "inf", qty: Number.POSITIVE_INFINITY },
      { id: "text-qty", qty: "2" },
    ]);
    assert.deepEqual(lines, [{ id: "buffer-solution", qty: 2 }]);
  });

  test("malformed JSON returns the empty state", () => {
    assert.deepEqual(parseStoredCommerce("{"), { cart: [], quote: [] });
    assert.deepEqual(parseStoredCommerce(null), { cart: [], quote: [] });
    assert.deepEqual(parseStoredCommerce(""), { cart: [], quote: [] });
  });
});
