import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { IdempotentCommerceStore } from "./submit-idempotency.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const sql = readFileSync(
  resolve(root, "supabase/migrations/20260913200000_tlb_commerce_submit_idempotency.sql"),
  "utf8",
);

const userA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const nonce1 = "11111111-1111-4111-8111-111111111111";
const nonce2 = "22222222-2222-4222-8222-222222222222";
const productId = "33333333-3333-4333-8333-333333333333";

function storeWithStock(stock = 10) {
  const store = new IdempotentCommerceStore();
  store.seedProduct({ id: productId, name: "Methanol", price: 40, stock, active: true });
  return store;
}

const items = [{ product_id: productId, quantity: 2 }];

describe("SQL contract", () => {
  test("new RPCs require a nonce and remain service_role-only", () => {
    assert.match(sql, /CREATE TABLE public\.commerce_submissions/);
    assert.match(sql, /CONSTRAINT commerce_submissions_nonce_key UNIQUE \(nonce\)/);
    assert.match(sql, /REVOKE ALL ON TABLE public\.commerce_submissions FROM PUBLIC, anon, authenticated/);
    assert.match(sql, /p_submission_nonce UUID/);
    assert.match(sql, /DROP FUNCTION IF EXISTS public\.create_order_with_items\(\s*uuid, text, text, text, text, text, text, jsonb\s*\)/);
    assert.match(sql, /DROP FUNCTION IF EXISTS public\.create_quote_with_items\(\s*uuid, text, text, text, text, text, jsonb\s*\)/);
    assert.match(
      sql,
      /REVOKE EXECUTE ON FUNCTION public\.create_order_with_items\(\s*uuid, text, text, text, text, text, text, jsonb, uuid\s*\) FROM PUBLIC, anon, authenticated/,
    );
    assert.match(
      sql,
      /REVOKE EXECUTE ON FUNCTION public\.create_quote_with_items\(\s*uuid, text, text, text, text, text, jsonb, uuid\s*\) FROM PUBLIC, anon, authenticated/,
    );
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.create_order_with_items\([\s\S]*?\) TO service_role/);
    assert.equal(sql.includes("GRANT EXECUTE") && sql.includes("TO authenticated"), false);
    assert.match(sql, /FOR UPDATE/);
    assert.match(sql, /RAISE EXCEPTION 'Unauthorized'/);
  });
});

describe("order idempotency model", () => {
  test("first order submission succeeds", () => {
    const store = storeWithStock();
    const result = store.submitOrder(userA, nonce1, items);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.replayed, false);
    assert.equal(store.ordersCreated, 1);
    assert.equal(store.products.get(productId)?.stock, 8);
    assert.equal(store.stockDecrements, 1);
  });

  test("same order nonce replay returns same order and does not decrement stock twice", () => {
    const store = storeWithStock();
    const first = store.submitOrder(userA, nonce1, items);
    const second = store.submitOrder(userA, nonce1, [{ product_id: productId, quantity: 9 }]);
    assert.equal(first.ok && second.ok, true);
    if (!first.ok || !second.ok) return;
    assert.equal(second.replayed, true);
    assert.equal(second.entityId, first.entityId);
    assert.equal(second.reference, first.reference);
    assert.equal(store.ordersCreated, 1);
    assert.equal(store.orders.size, 1);
    assert.equal(store.products.get(productId)?.stock, 8);
    assert.equal(store.stockDecrements, 1);
  });

  test("different nonce creates a separate intentional order", () => {
    const store = storeWithStock();
    const first = store.submitOrder(userA, nonce1, items);
    const second = store.submitOrder(userA, nonce2, items);
    assert.equal(first.ok && second.ok, true);
    if (!first.ok || !second.ok) return;
    assert.notEqual(second.entityId, first.entityId);
    assert.equal(store.ordersCreated, 2);
    assert.equal(store.products.get(productId)?.stock, 6);
  });

  test("nonce cannot cross users", () => {
    const store = storeWithStock();
    const first = store.submitOrder(userA, nonce1, items);
    const second = store.submitOrder(userB, nonce1, items);
    assert.equal(first.ok, true);
    assert.equal(second.ok, false);
    if (second.ok) return;
    assert.equal(second.error, "Unauthorized");
    assert.equal(store.ordersCreated, 1);
    assert.equal(store.products.get(productId)?.stock, 8);
  });

  test("first failed transaction does not permanently consume nonce", () => {
    const store = storeWithStock();
    const failed = store.submitOrder(userA, nonce1, items, true);
    assert.equal(failed.ok, false);
    assert.equal(store.ordersCreated, 0);
    assert.equal(store.claims.size, 0);
    assert.equal(store.products.get(productId)?.stock, 10);

    const retry = store.submitOrder(userA, nonce1, items);
    assert.equal(retry.ok, true);
    if (!retry.ok) return;
    assert.equal(retry.replayed, false);
    assert.equal(store.ordersCreated, 1);
    assert.equal(store.products.get(productId)?.stock, 8);
  });
});

describe("quote idempotency model", () => {
  test("first quote submission succeeds", () => {
    const store = storeWithStock();
    const result = store.submitQuote(userA, nonce1, items);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.replayed, false);
    assert.equal(store.quotesCreated, 1);
  });

  test("same quote nonce replay returns same quote and does not create a second quote", () => {
    const store = storeWithStock();
    const first = store.submitQuote(userA, nonce1, items);
    const second = store.submitQuote(userA, nonce1, [{ product_id: productId, quantity: 99 }]);
    assert.equal(first.ok && second.ok, true);
    if (!first.ok || !second.ok) return;
    assert.equal(second.replayed, true);
    assert.equal(second.entityId, first.entityId);
    assert.equal(store.quotesCreated, 1);
    assert.equal(store.quotes.size, 1);
  });

  test("quote nonce cannot cross users or operations", () => {
    const store = storeWithStock();
    const quote = store.submitQuote(userA, nonce1, items);
    const otherUser = store.submitQuote(userB, nonce1, items);
    const asOrder = store.submitOrder(userA, nonce1, items);
    assert.equal(quote.ok, true);
    assert.equal(otherUser.ok, false);
    assert.equal(asOrder.ok, false);
    assert.equal(store.quotesCreated, 1);
    assert.equal(store.ordersCreated, 0);
  });
});

describe("server function contract", () => {
  test("createOrder/createQuote pass submissionNonce and still require auth", () => {
    const orders = readFileSync(resolve(root, "src/lib/orders.ts"), "utf8");
    const quotes = readFileSync(resolve(root, "src/lib/quotes.ts"), "utf8");
    assert.match(orders, /requireSupabaseAuth/);
    assert.match(orders, /submissionNonce/);
    assert.match(orders, /p_submission_nonce: data\.submissionNonce/);
    assert.match(orders, /data\.userId !== context\.userId/);
    assert.match(quotes, /requireSupabaseAuth/);
    assert.match(quotes, /p_submission_nonce: data\.submissionNonce/);
    assert.match(quotes, /context\.userId/);
    assert.equal(orders.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
    assert.equal(quotes.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
  });
});
