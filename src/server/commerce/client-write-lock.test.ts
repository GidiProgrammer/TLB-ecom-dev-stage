import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(
  resolve(here, "../../../supabase/migrations/20260914140000_tlb_client_commerce_write_lock.sql"),
  "utf8",
);
const adminOps = readFileSync(resolve(here, "../../lib/admin-ops.ts"), "utf8");

describe("client commerce write lock SQL", () => {
  test("drops leftover FOR ALL policies and restates SELECT-only customer grants", () => {
    assert.match(sql, /DROP POLICY IF EXISTS "own orders"/);
    assert.match(sql, /DROP POLICY IF EXISTS "own quotes"/);
    assert.match(sql, /REVOKE ALL ON TABLE public\.orders FROM PUBLIC, anon, authenticated/);
    assert.match(sql, /GRANT SELECT ON TABLE public\.orders TO authenticated/);
    assert.match(sql, /REVOKE ALL ON TABLE public\.quotes FROM PUBLIC, anon, authenticated/);
    assert.match(sql, /GRANT SELECT ON TABLE public\.quotes TO authenticated/);
    assert.match(sql, /REVOKE ALL ON TABLE public\.order_items FROM PUBLIC, anon, authenticated/);
    assert.match(sql, /GRANT SELECT ON TABLE public\.order_items TO authenticated/);
    assert.match(sql, /REVOKE ALL ON TABLE public\.quote_items FROM PUBLIC, anon, authenticated/);
    assert.match(sql, /GRANT SELECT ON TABLE public\.quote_items TO authenticated/);
    assert.doesNotMatch(sql, /GRANT INSERT ON TABLE public\.orders/);
    assert.doesNotMatch(sql, /GRANT UPDATE ON TABLE public\.orders/);
    assert.doesNotMatch(sql, /ALTER TABLE[\s\S]{0,80}FORCE ROW LEVEL SECURITY/);
  });

  test("privileged RPCs are revoked from clients", () => {
    for (const name of [
      "create_order_with_items",
      "create_quote_with_items",
      "cancel_order_and_restore_stock",
      "staff_restock_product",
      "accept_quote",
      "claim_transactional_email_outbox",
      "restock_product",
      "decrement_stock",
    ]) {
      assert.equal(sql.includes(`REVOKE EXECUTE ON FUNCTION public.${name}`), true, name);
    }
  });
});

describe("terminal quote price protection", () => {
  test("database trigger rejects quoted_price changes on accepted or declined quotes", () => {
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.prevent_terminal_quote_price_change/);
    assert.match(sql, /_status IN \('accepted', 'declined'\)/);
    assert.match(sql, /BEFORE UPDATE OF quoted_price ON public\.quote_items/);
    assert.match(sql, /FOR UPDATE/);
  });

  test("staff server path checks terminal status before updating quoted_price", () => {
    assert.match(adminOps, /isTerminalQuoteStatus\(quote\.status\)/);
    assert.match(adminOps, /Quoted prices cannot be changed after this quotation is closed/);
    const statusCheck = adminOps.indexOf("isTerminalQuoteStatus(quote.status)");
    const update = adminOps.indexOf('.update({ quoted_price: quotedPrice })');
    assert.ok(statusCheck > 0 && update > statusCheck);
  });
});
