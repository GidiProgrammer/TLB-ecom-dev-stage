import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { QuoteAcceptStore } from "./quote-accept.ts";
import { isQuoteCustomerAcceptable } from "../../lib/commerce-status.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const sql = readFileSync(resolve(root, "supabase/migrations/20260914020000_tlb_quote_accept.sql"), "utf8");
const quotesOps = readFileSync(resolve(root, "src/lib/quotes.ts"), "utf8");
const accountUi = readFileSync(resolve(root, "src/routes/_authenticated/account.tsx"), "utf8");
const adminRoute = readFileSync(resolve(root, "src/components/admin/QuoteWorkspace.tsx"), "utf8");

const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function storeWithQuote(status: "submitted" | "reviewed" | "quoted" | "accepted" | "declined") {
  const store = new QuoteAcceptStore();
  store.seedQuote({ id: "q1", userId: owner, status, reference: "QT-1" });
  return store;
}

describe("accept_quote SQL contract", () => {
  test("RPC is service_role only, locks the quote, and has no order or stock side effects", () => {
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.accept_quote\(p_quote_id UUID\)/);
    assert.match(sql, /SECURITY DEFINER/);
    assert.match(sql, /SET search_path = public/);
    assert.match(sql, /FOR UPDATE/);
    assert.match(sql, /REVOKE EXECUTE ON FUNCTION public\.accept_quote\(uuid\)/);
    assert.match(sql, /FROM PUBLIC, anon, authenticated/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.accept_quote\(uuid\)\s+TO service_role/);
    assert.doesNotMatch(sql, /GRANT EXECUTE ON FUNCTION public\.accept_quote\(uuid\)\s+TO authenticated/);
    assert.equal(sql.includes("create_order_with_items"), false);
    assert.equal(sql.includes("decrement_stock"), false);
    assert.equal(sql.includes("stock_movements"), false);
    assert.equal(sql.includes("commerce_submissions"), false);
    assert.equal(sql.includes("INSERT INTO public.orders"), false);
  });
});

describe("quote acceptance model", () => {
  test("quoted -> accepted succeeds once", () => {
    const store = storeWithQuote("quoted");
    const first = store.accept(owner, "q1");
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.replayed, false);
    assert.equal(first.status, "accepted");
    assert.equal(store.quotes.get("q1")?.status, "accepted");
  });

  test("already accepted is an idempotent replay", () => {
    const store = storeWithQuote("quoted");
    store.accept(owner, "q1");
    const second = store.accept(owner, "q1");
    assert.equal(second.ok && second.replayed, true);
    assert.equal(store.quotes.get("q1")?.status, "accepted");
  });

  test("concurrent double accept transitions once", () => {
    const store = storeWithQuote("quoted");
    const first = store.accept(owner, "q1");
    const second = store.accept(owner, "q1");
    assert.equal(first.ok, true);
    assert.equal(second.ok && "replayed" in second && second.replayed, true);
    assert.equal(store.quotes.get("q1")?.status, "accepted");
  });

  test("unauthenticated and wrong-owner requests are rejected", () => {
    const store = storeWithQuote("quoted");
    assert.equal(store.accept("", "q1").ok, false);
    assert.equal(store.accept(other, "q1").ok, false);
    assert.equal(store.quotes.get("q1")?.status, "quoted");
  });

  test("invalid statuses cannot be accepted", () => {
    for (const status of ["submitted", "reviewed", "declined"] as const) {
      const store = storeWithQuote(status);
      assert.equal(store.accept(owner, "q1").ok, false);
      assert.equal(store.quotes.get("q1")?.status, status);
      assert.equal(isQuoteCustomerAcceptable(status), false);
    }
  });

  test("acceptance never creates orders or mutates stock", () => {
    const store = storeWithQuote("quoted");
    store.accept(owner, "q1");
    store.accept(owner, "q1");
    assert.equal(store.ordersCreated, 0);
    assert.equal(store.stockDecrements, 0);
    assert.equal(store.restocks, 0);
    assert.equal(store.stockMovements, 0);
    assert.equal(store.commerceSubmissions, 0);
  });
});

describe("customer accept server / UI contract", () => {
  test("acceptQuote is auth-gated, uses the RPC, and stays off the browser client", () => {
    assert.match(quotesOps, /export const acceptQuote/);
    assert.match(quotesOps, /requireSupabaseAuth/);
    assert.match(quotesOps, /existing\.user_id !== context\.userId/);
    assert.match(quotesOps, /assertValidQuoteTransition\(existing\.status, "accepted"\)/);
    assert.match(quotesOps, /rpc\("accept_quote"/);
    assert.equal(quotesOps.includes("create_order_with_items"), false);
    assert.equal(quotesOps.includes("commerce_submissions"), false);
    assert.equal(quotesOps.includes("enqueueQuoteLifecycleFromTransition"), false);
    assert.match(accountUi, /acceptQuote/);
    assert.match(accountUi, /Accept quotation/);
    assert.equal(accountUi.includes("accept_quote"), false);
    assert.equal(accountUi.includes("from(\"quotes\")"), false);
    assert.match(adminRoute, /not an order, payment, or\s+warehouse/);
  });
});
