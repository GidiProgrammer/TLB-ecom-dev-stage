import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { orderDetailModel, quoteDetailModel, recordedText } from "./admin-detail.ts";

const here = dirname(fileURLToPath(import.meta.url));

function order(overrides: Record<string, unknown> = {}) {
  return {
    reference: "TLB-20261001-ABC123",
    status: "pending" as const,
    created_at: "2026-10-01T08:00:00.000Z",
    updated_at: "2026-10-01T09:30:00.000Z",
    shipping_name: "Ama Mensah",
    shipping_email: "ama@lab.test",
    shipping_phone: "0240000000",
    institution: "Korle Lab",
    shipping_address: "12 Ring Road",
    shipping_city: "Accra",
    subtotal: 30,
    total: 30,
    payment_reference: null,
    order_items: [
      {
        id: "item-1",
        product_name: "Beaker 250 ml",
        quantity: 2,
        unit_price: 10,
        line_total: 20,
      },
      {
        id: "item-2",
        product_name: "Pipette",
        quantity: 1,
        unit_price: 10,
        line_total: 10,
      },
    ],
    ...overrides,
  };
}

describe("order detail model", () => {
  test("keeps every line and the stored totals", () => {
    const model = orderDetailModel(order());
    assert.equal(model.reference, "TLB-20261001-ABC123");
    assert.equal(model.status, "pending");
    assert.equal(model.createdAt, "2026-10-01T08:00:00.000Z");
    assert.equal(model.updatedAt, "2026-10-01T09:30:00.000Z");
    assert.equal("cancelledAt" in model, false);
    assert.deepEqual(
      model.items.map((item) => [item.productName, item.quantity, item.unitPrice, item.lineTotal]),
      [
        ["Beaker 250 ml", 2, 10, 20],
        ["Pipette", 1, 10, 10],
      ],
    );
    assert.equal(model.subtotal, 30);
    assert.equal(model.total, 30);
    assert.equal(model.paymentReference, null);
  });

  test("omits blank contact, delivery, and payment fields", () => {
    const model = orderDetailModel(
      order({
        shipping_name: "  ",
        shipping_email: null,
        shipping_phone: "",
        institution: null,
        shipping_address: " ",
        shipping_city: null,
        payment_reference: "   ",
      }),
    );
    assert.deepEqual(model.customer, []);
    assert.deepEqual(model.delivery, []);
    assert.equal(model.paymentReference, null);
  });

  test("shows a payment reference only when one was stored", () => {
    const model = orderDetailModel(order({ payment_reference: " PAY-44 " }));
    assert.equal(model.paymentReference, "PAY-44");
    assert.equal(model.status, "pending");
    assert.notEqual(model.updatedAt, "cancelled");
  });

  test("a cancelled order still exposes last updated separately from status", () => {
    const model = orderDetailModel(
      order({ status: "cancelled", updated_at: "2026-10-02T12:00:00.000Z" }),
    );
    assert.equal(model.status, "cancelled");
    assert.equal(model.updatedAt, "2026-10-02T12:00:00.000Z");
    assert.equal(Object.hasOwn(model, "cancelledAt"), false);
  });
});

describe("quote detail model", () => {
  test("line estimates and a complete total use the existing helpers", () => {
    const model = quoteDetailModel({
      reference: "QT-20261001-ABC123",
      status: "quoted",
      created_at: "2026-10-01T08:00:00.000Z",
      updated_at: "2026-10-01T10:00:00.000Z",
      contact_name: "Kwesi Boateng",
      contact_email: "kwesi@lab.test",
      contact_phone: "0200000000",
      institution: "Chemistry Dept",
      notes: "Need class A glassware",
      quote_items: [
        { id: "q1", product_name: "Flask", quantity: 2, quoted_price: 15 },
        { id: "q2", product_name: "Stand", quantity: 1, quoted_price: 5 },
      ],
    });
    assert.equal(model.lines[0]?.lineEstimate, 30);
    assert.equal(model.lines[1]?.lineEstimate, 5);
    assert.equal(model.total, 35);
    assert.equal(model.incomplete, false);
    assert.equal(model.notes, "Need class A glassware");
    assert.deepEqual(
      model.requester.map((fact) => fact.label),
      ["Name", "Email", "Phone", "Institution"],
    );
  });

  test("an unpriced line makes the total incomplete and omits that line estimate", () => {
    const model = quoteDetailModel({
      reference: "QT-20261001-EMPTY1",
      status: "submitted",
      created_at: "2026-10-01T08:00:00.000Z",
      updated_at: "2026-10-01T08:00:00.000Z",
      contact_name: null,
      contact_email: " ",
      contact_phone: null,
      institution: "",
      notes: "  ",
      quote_items: [
        { id: "q1", product_name: "Flask", quantity: 2, quoted_price: 15 },
        { id: "q2", product_name: "Stand", quantity: 1, quoted_price: null },
      ],
    });
    assert.equal(model.lines[0]?.lineEstimate, 30);
    assert.equal(model.lines[1]?.lineEstimate, null);
    assert.equal(model.lines[1]?.quotedPrice, null);
    assert.equal(model.total, null);
    assert.equal(model.incomplete, true);
    assert.equal(model.notes, null);
    assert.deepEqual(model.requester, []);
  });
});

describe("recorded text", () => {
  test("trims stored snapshots", () => {
    assert.equal(recordedText("  Accra "), "Accra");
    assert.equal(recordedText("   "), null);
    assert.equal(recordedText(null), null);
  });
});

describe("admin detail security boundary", () => {
  test("detail UI reads the model and does not take privileged writes", () => {
    const files = [
      "components/admin/OrderWorkspace.tsx",
      "components/admin/OrderDetailSheet.tsx",
      "components/admin/QuoteWorkspace.tsx",
      "components/admin/QuoteDetailSheet.tsx",
      "components/admin/StaffDetailSheet.tsx",
      "lib/admin-detail.ts",
    ].map((file) => readFileSync(resolve(here, "..", file), "utf8"));
    const ui = files.join("\n");

    assert.match(ui, /Open order /);
    assert.match(ui, /Open quote /);
    assert.match(ui, /cancelOrder/);
    assert.match(ui, /updateOrderStatus/);
    assert.match(ui, /updateQuoteStatus/);
    assert.match(ui, /updateQuoteItemPrice/);
    assert.match(ui, /isOrderCancellable/);
    assert.match(ui, /quoteLineEstimate/);
    assert.match(ui, /quoteQuotedTotal/);
    assert.match(ui, /Quoted total is incomplete/);
    assert.equal(ui.includes("cancelled_at"), false);
    assert.equal(ui.includes("Cancelled at"), false);
    assert.equal(ui.includes("@/server/"), false);
    assert.equal(ui.includes("src/server/"), false);
    assert.equal(ui.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
    assert.equal(ui.includes("cancel_order_and_restore_stock"), false);
    assert.equal(ui.includes("from(\"payments\")"), false);
    assert.equal(ui.includes("stock_movements"), false);
    assert.equal(ui.includes("waybill"), false);
    assert.equal(ui.includes("customer_purchase_orders"), false);
  });
});
