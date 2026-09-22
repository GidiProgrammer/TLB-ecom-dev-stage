import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { normalizeShopSort } from "./shop-search.ts";

describe("normalizeShopSort", () => {
  test("keeps the two catalogue sorts", () => {
    assert.equal(normalizeShopSort("price-asc"), "price-asc");
    assert.equal(normalizeShopSort("price-desc"), "price-desc");
  });

  test("unknown and default sorts are not a selected value", () => {
    assert.equal(normalizeShopSort("not-a-sort"), undefined);
    assert.equal(normalizeShopSort("name"), undefined);
    assert.equal(normalizeShopSort(""), undefined);
    assert.equal(normalizeShopSort(1), undefined);
    assert.equal(normalizeShopSort(null), undefined);
  });
});
