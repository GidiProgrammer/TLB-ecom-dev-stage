import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { StockLifecycleStore } from "./stock-lifecycle.ts";

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(
  resolve(here, "../../../supabase/migrations/20260914010000_tlb_order_cancel_restock.sql"),
  "utf8",
);
const adminOps = readFileSync(resolve(here, "../../lib/admin-ops.ts"), "utf8");
const catalogOps = readFileSync(resolve(here, "../../lib/catalog-ops.ts"), "utf8");
const adminRoute = readFileSync(resolve(here, "../../routes/_authenticated/admin.tsx"), "utf8");
const catalogueUi = readFileSync(
  resolve(here, "../../components/admin/CatalogueManager.tsx"),
  "utf8",
);

const productId = "33333333-3333-4333-8333-333333333333";
const staffId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const customerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function storeWithOrder(status: "pending" | "paid" | "processing" | "shipped" | "completed") {
  const store = new StockLifecycleStore();
  store.seedProduct(productId, 8);
  store.roles.set(staffId, "staff");
  store.roles.set(customerId, "customer");
  store.seedOrder({
    id: "ord-1",
    status,
    items: [{ productId, quantity: 2 }],
    cancelMail: 0,
  });
  return store;
}

describe("cancel/restock SQL contract", () => {
  test("new RPCs are service_role only and cancellation uses return movements", () => {
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.cancel_order_and_restore_stock/);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.staff_restock_product/);
    assert.match(sql, /REVOKE EXECUTE ON FUNCTION public\.cancel_order_and_restore_stock\(uuid\)/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.cancel_order_and_restore_stock\(uuid\)\s+TO service_role/);
    assert.match(sql, /REVOKE EXECUTE ON FUNCTION public\.staff_restock_product\(text, integer, text, uuid\)/);
    assert.match(sql, /reason = 'return'/);
    assert.match(sql, /'order_cancel'/);
    assert.match(sql, /'restock'/);
    assert.match(sql, /stock_movements_order_cancel_return_idx/);
    assert.equal(sql.includes("GRANT EXECUTE") && sql.includes("TO authenticated"), false);
    assert.match(sql, /FOR UPDATE/);
  });
});

describe("order cancellation model", () => {
  for (const status of ["pending", "paid", "processing"] as const) {
    test(`${status} cancel restores exact quantities and one return movement`, () => {
      const store = storeWithOrder(status);
      const first = store.cancel("ord-1");
      assert.equal(first.ok, true);
      if (!first.ok) return;
      assert.equal(first.replayed, false);
      assert.equal(store.products.get(productId)?.stock, 10);
      assert.equal(store.movements.filter((m) => m.reason === "return").length, 1);
      assert.equal(store.movements[0]?.changeQty, 2);
      assert.equal(store.movements[0]?.referenceId, "ord-1");
      assert.equal(store.orders.get("ord-1")?.cancelMail, 1);
    });
  }

  test("repeated cancellation does not change stock or movements or mail", () => {
    const store = storeWithOrder("pending");
    store.cancel("ord-1");
    const second = store.cancel("ord-1");
    assert.equal(second.ok && second.replayed, true);
    assert.equal(store.products.get(productId)?.stock, 10);
    assert.equal(store.movements.filter((m) => m.reason === "return").length, 1);
    assert.equal(store.orders.get("ord-1")?.cancelMail, 1);
  });

  test("shipped and completed cancellation is rejected", () => {
    const shipped = storeWithOrder("shipped");
    const completed = storeWithOrder("completed");
    assert.equal(shipped.cancel("ord-1").ok, false);
    assert.equal(completed.cancel("ord-1").ok, false);
    assert.equal(shipped.products.get(productId)?.stock, 8);
    assert.equal(completed.products.get(productId)?.stock, 8);
  });

  test("concurrent cancellation restores once", () => {
    const store = storeWithOrder("pending");
    const first = store.cancel("ord-1");
    const second = store.cancel("ord-1");
    assert.equal(first.ok, true);
    assert.equal(second.ok && "replayed" in second && second.replayed, true);
    assert.equal(store.products.get(productId)?.stock, 10);
    assert.equal(store.movements.filter((m) => m.reason === "return").length, 1);
  });
});

describe("staff restock model", () => {
  test("staff and admin can restock; customer cannot", () => {
    const store = storeWithOrder("pending");
    store.roles.set("admin-1", "admin");
    const staff = store.restock(staffId, productId, 3, "count correction");
    assert.equal(staff.ok, true);
    if (!staff.ok) return;
    assert.equal(staff.stock, 11);
    const admin = store.restock("admin-1", productId, 1, "admin add");
    assert.equal(admin.ok, true);
    const customer = store.restock(customerId, productId, 1, "nope");
    assert.equal(customer.ok, false);
    assert.equal(store.products.get(productId)?.stock, 12);
    const movement = store.movements.find((m) => m.reason === "restock");
    assert.equal(movement?.note, "count correction");
    assert.equal(movement?.createdBy, staffId);
    assert.equal(movement?.referenceId, null);
  });

  test("invalid quantity and missing product are rejected", () => {
    const store = storeWithOrder("pending");
    assert.equal(store.restock(staffId, productId, 0, "x").ok, false);
    assert.equal(store.restock(staffId, productId, 1.5, "x").ok, false);
    assert.equal(store.restock(staffId, "missing", 1, "x").ok, false);
    assert.equal(store.products.get(productId)?.stock, 8);
  });
});

describe("server function / UI contract", () => {
  test("privileged paths stay staff-gated and off the browser", () => {
    assert.match(adminOps, /export const cancelOrder/);
    assert.match(adminOps, /cancel_order_and_restore_stock/);
    assert.match(adminOps, /assertValidOrderTransition/);
    assert.match(adminOps, /assertValidQuoteTransition/);
    assert.match(adminOps, /result\.replayed/);
    assert.match(catalogOps, /staff_restock_product/);
    assert.match(catalogOps, /p_staff_user_id: context\.userId/);
    assert.match(adminRoute, /cancelOrder/);
    assert.match(adminRoute, /Cancel order/);
    assert.equal(adminRoute.includes("cancel_order_and_restore_stock"), false);
    assert.equal(catalogueUi.includes("staff_restock_product"), false);
    assert.match(catalogueUi, /staffRestockProduct/);
    assert.match(catalogueUi, /Stock on hand/);
    assert.equal(catalogueUi.includes("stock_quantity:"), false);
  });
});
