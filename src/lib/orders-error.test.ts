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
    const checkout = readFileSync(resolve(here, "../routes/checkout.index.tsx"), "utf8");
    const confirmed = readFileSync(resolve(here, "../routes/checkout.confirmed.tsx"), "utf8");
    const quoteConfirmed = readFileSync(resolve(here, "../routes/quote.confirmed.tsx"), "utf8");
    assert.match(confirmed, /Order received/);
    assert.doesNotMatch(confirmed, /Order confirmed/);
    assert.match(confirmed, /submitted successfully/);
    assert.match(quoteConfirmed, /Your quote request was received/);
    assert.match(quoteConfirmed, /later in your account/);
    assert.doesNotMatch(checkout, /safely submit again/);
    assert.doesNotMatch(confirmed, /safely submit again/);
    assert.doesNotMatch(quoteConfirmed, /safely submit again/);
    assert.doesNotMatch(checkout, /needs to be retried/);
    assert.doesNotMatch(confirmed, /needs to be retried/);
    assert.doesNotMatch(quoteConfirmed, /needs to be retried/);
    assert.match(checkout, /product_id: p\.productId, quantity: l\.qty/);
    const quoteForm = readFileSync(resolve(here, "../routes/quote.index.tsx"), "utf8");
    assert.match(quoteForm, /product_id: p\.productId, quantity: l\.qty/);
    assert.doesNotMatch(quoteForm, /quoted_price/);
    assert.doesNotMatch(checkout, /quoted_price/);
  });
});
