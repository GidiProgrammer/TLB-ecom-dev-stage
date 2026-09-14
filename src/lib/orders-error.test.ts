import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mapOrderError } from "./order-errors.ts";

const here = dirname(fileURLToPath(import.meta.url));

describe("mapOrderError", () => {
  test("known failures stay specific", () => {
    assert.match(mapOrderError("Unauthorized"), /Unauthorized/);
    assert.equal(mapOrderError("Cannot create an order with no items"), "Your cart is empty");
    assert.equal(mapOrderError("Product abc not found"), "A product in your cart is not available");
    assert.equal(
      mapOrderError("Insufficient stock for Methanol: have 0, need 2"),
      "Insufficient stock for one or more products",
    );
    assert.equal(mapOrderError("Invalid quantity"), "Invalid quantity");
  });

  test("unknown Postgres or RPC text is not returned", () => {
    const raw = 'duplicate key value violates unique constraint "orders_reference_key"';
    assert.equal(
      mapOrderError(raw),
      "We couldn't place your order right now. Please try again or contact TLB.",
    );
    assert.equal(mapOrderError(raw).includes("orders_reference_key"), false);
    assert.equal(
      mapOrderError("relation public.commerce_submissions does not exist").includes("commerce_submissions"),
      false,
    );
  });

  test("checkout confirmation does not invite a second submit", () => {
    const checkout = readFileSync(resolve(here, "../routes/checkout.tsx"), "utf8");
    assert.match(checkout, /submitted successfully/);
    assert.doesNotMatch(checkout, /safely submit again/);
    assert.doesNotMatch(checkout, /needs to be retried/);
  });
});
