import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const accountQueries = readFileSync(resolve(here, "queries/account.ts"), "utf8");

describe("customer account commerce query scoping", () => {
  test("order list and owned-by-reference fetches constrain user_id", () => {
    assert.match(accountQueries, /export async function fetchAccountOrders\(userId: string\)/);
    assert.match(accountQueries, /\.eq\("user_id", userId\)/);
    assert.match(accountQueries, /export async function fetchOwnedOrderByReference\(/);
    const orderOwned = accountQueries.slice(
      accountQueries.indexOf("export async function fetchOwnedOrderByReference"),
      accountQueries.indexOf("export async function fetchAccountQuotes"),
    );
    assert.match(orderOwned, /\.eq\("reference", reference\)/);
    assert.match(orderOwned, /\.eq\("user_id", userId\)/);
  });

  test("quote list and owned-by-reference fetches constrain user_id", () => {
    assert.match(accountQueries, /export async function fetchAccountQuotes\(userId: string\)/);
    const quoteList = accountQueries.slice(
      accountQueries.indexOf("export async function fetchAccountQuotes"),
      accountQueries.indexOf("export async function fetchOwnedQuoteByReference"),
    );
    assert.match(quoteList, /\.eq\("user_id", userId\)/);
    const quoteOwned = accountQueries.slice(accountQueries.indexOf("export async function fetchOwnedQuoteByReference"));
    assert.match(quoteOwned, /\.eq\("reference", reference\)/);
    assert.match(quoteOwned, /\.eq\("user_id", userId\)/);
  });

  test("confirmation CTAs use account history search", () => {
    const checkout = readFileSync(resolve(here, "../routes/checkout.confirmed.tsx"), "utf8");
    const quote = readFileSync(resolve(here, "../routes/quote.confirmed.tsx"), "utf8");
    assert.match(checkout, /accountHistorySearch\("order", query\.data\.reference\)/);
    assert.match(quote, /accountHistorySearch\("quote", query\.data\.reference\)/);
    assert.match(checkout, /fetchOwnedOrderByReference\(ref!, user!\.id\)/);
    assert.match(quote, /fetchOwnedQuoteByReference\(ref!, user!\.id\)/);
  });

  test("customer fetchers do not use the service role", () => {
    assert.equal(accountQueries.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
    assert.equal(accountQueries.includes("supabaseAdmin"), false);
    assert.equal(accountQueries.includes("client.server"), false);
  });
});
