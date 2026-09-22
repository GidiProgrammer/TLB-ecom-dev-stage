import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { productSearchOrFilter } from "./product-search.ts";

describe("productSearchOrFilter", () => {
  test("keeps parentheses inside a quoted pattern", () => {
    const filter = productSearchOrFilter("Buffer Solution pH 7.00 (colour coded)");
    assert.ok(filter);
    assert.match(filter, /name\.ilike\."%Buffer Solution pH 7\.00 \(colour coded\)%"/);
    assert.match(filter, /description\.ilike\./);
    assert.match(filter, /sku\.ilike\./);
    assert.match(filter, /slug\.ilike\./);
    assert.doesNotMatch(filter, /ilike\.%Buffer Solution pH 7\.00 \(/);
  });

  test("keeps commas inside a quoted pattern", () => {
    const filter = productSearchOrFilter("sodium hydroxide, pellets");
    assert.equal(
      filter,
      'name.ilike."%sodium hydroxide, pellets%",description.ilike."%sodium hydroxide, pellets%",sku.ilike."%sodium hydroxide, pellets%",slug.ilike."%sodium hydroxide, pellets%"',
    );
  });

  test("ordinary terms stay quoted ilike patterns", () => {
    assert.equal(
      productSearchOrFilter("methanol"),
      'name.ilike."%methanol%",description.ilike."%methanol%",sku.ilike."%methanol%",slug.ilike."%methanol%"',
    );
  });

  test("blank search does not build a filter", () => {
    assert.equal(productSearchOrFilter("   "), null);
    assert.equal(productSearchOrFilter(""), null);
  });
});
