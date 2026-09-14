import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { getCapturedEmails, resetCapturedEmails } from "./capture-driver.ts";
import {
  enqueueOrderCreatedFromRecord,
  enqueueQuoteCreatedFromRecord,
  notifyAfterCommerceCommit,
  ORDER_CREATED_TEMPLATE_ID,
  QUOTE_CREATED_TEMPLATE_ID,
} from "./commerce.ts";
import { transactionalEventKey } from "./events.ts";
import { listMemoryOutbox, resetMemoryOutbox } from "./outbox.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");

beforeEach(() => {
  process.env["MAIL_OUTBOX_BACKEND"] = "memory";
  process.env["MAIL_DRIVER"] = "capture";
  resetMemoryOutbox();
  resetCapturedEmails();
});

afterEach(() => {
  resetMemoryOutbox();
  resetCapturedEmails();
});

describe("order.created wiring", () => {
  test("successful order creation enqueues exactly one order.created event", async () => {
    const order = {
      id: "11111111-1111-4111-8111-111111111111",
      reference: "TLB-20260912-ABC123",
      shippingEmail: "lab@example.test",
    };

    const first = await enqueueOrderCreatedFromRecord(order);
    assert.equal(first.ok, true);
    if (!first.ok) return;

    assert.equal(first.created, true);
    assert.equal(first.row.eventKey, `order.created:${order.id}`);
    assert.equal(first.row.eventType, "order.created");
    assert.equal(first.row.templateId, ORDER_CREATED_TEMPLATE_ID);
    assert.equal(first.row.recipientEmail, "lab@example.test");
    assert.equal(first.row.payload["reference"], order.reference);
    assert.equal(first.row.payload["notice"], "order_received");
    assert.equal("paid" in first.row.payload, false);
    assert.equal("payment" in first.row.payload, false);
    assert.equal(listMemoryOutbox().length, 1);
    assert.equal(getCapturedEmails().length, 0);
  });

  test("duplicate enqueue uses the same event key and does not create a second row", async () => {
    const order = {
      id: "22222222-2222-4222-8222-222222222222",
      reference: "TLB-1",
      shippingEmail: "a@example.test",
    };

    const first = await enqueueOrderCreatedFromRecord(order);
    const second = await enqueueOrderCreatedFromRecord(order);

    assert.equal(first.ok && first.created, true);
    assert.equal(second.ok && second.created, false);
    assert.equal(listMemoryOutbox().length, 1);
    if (first.ok && second.ok) {
      assert.equal(second.row.id, first.row.id);
      assert.equal(second.row.eventKey, transactionalEventKey("order.created", order.id));
    }
  });
});

describe("quote.created wiring", () => {
  test("successful quote creation enqueues exactly one quote.created event", async () => {
    const quote = {
      id: "33333333-3333-4333-8333-333333333333",
      reference: "QT-20260912-XYZ789",
      contactEmail: "quotes@example.test",
    };

    const first = await enqueueQuoteCreatedFromRecord(quote);
    assert.equal(first.ok, true);
    if (!first.ok) return;

    assert.equal(first.created, true);
    assert.equal(first.row.eventKey, `quote.created:${quote.id}`);
    assert.equal(first.row.eventType, "quote.created");
    assert.equal(first.row.templateId, QUOTE_CREATED_TEMPLATE_ID);
    assert.equal(first.row.recipientEmail, "quotes@example.test");
    assert.equal(first.row.payload["reference"], quote.reference);
    assert.equal(first.row.payload["notice"], "quote_submitted");
    assert.equal("quoted_price" in first.row.payload, false);
    assert.equal("price" in first.row.payload, false);
    assert.equal(listMemoryOutbox().length, 1);
    assert.equal(getCapturedEmails().length, 0);
  });

  test("duplicate quote enqueue does not create a second row", async () => {
    const quote = {
      id: "44444444-4444-4444-8444-444444444444",
      reference: "QT-1",
      contactEmail: "b@example.test",
    };

    await enqueueQuoteCreatedFromRecord(quote);
    await enqueueQuoteCreatedFromRecord(quote);
    assert.equal(listMemoryOutbox().length, 1);
    assert.equal(listMemoryOutbox()[0]?.eventKey, transactionalEventKey("quote.created", quote.id));
  });
});

describe("post-commit failure semantics", () => {
  test("failed enqueue still returns the commerce result so a retry is not required", async () => {
    const commerce = { orderId: "ord-committed", reference: "TLB-KEEP" };
    const returned = await notifyAfterCommerceCommit(commerce, async () => {
      throw new Error("outbox unavailable");
    });
    assert.deepEqual(returned, commerce);
    assert.equal(listMemoryOutbox().length, 0);
  });
});

describe("client / security contract", () => {
  test("browser sources do not contain service-role, mail secrets, or outbox writes", () => {
    const clientFiles = [
      "src/routes/checkout.tsx",
      "src/routes/quote.tsx",
      "src/routes/contact.tsx",
      "src/routes/index.tsx",
      "src/integrations/supabase/client.ts",
    ];
    for (const rel of clientFiles) {
      const text = readFileSync(resolve(root, rel), "utf8");
      assert.equal(text.includes("SUPABASE_SERVICE_ROLE_KEY"), false, rel);
      assert.equal(text.includes("MAIL_DRIVER"), false, rel);
      assert.equal(text.includes("transactional_email_outbox"), false, rel);
      assert.equal(text.includes("@/server/mail"), false, rel);
      assert.equal(text.includes("processTransactionalEmailOutbox"), false, rel);
      assert.equal(text.includes("create_order_with_items"), false, rel);
      assert.equal(text.includes("create_quote_with_items"), false, rel);
      assert.equal(text.includes("accept_quote"), false, rel);
      assert.equal(text.includes("CONTACT_RECIPIENT_EMAIL"), false, rel);
    }
  });

  test("order and quote server functions still require auth and call the SECURITY DEFINER RPCs", () => {
    const orders = readFileSync(resolve(root, "src/lib/orders.ts"), "utf8");
    const quotes = readFileSync(resolve(root, "src/lib/quotes.ts"), "utf8");

    assert.match(orders, /requireSupabaseAuth/);
    assert.match(orders, /create_order_with_items/);
    assert.match(orders, /p_submission_nonce: data\.submissionNonce/);
    assert.match(orders, /enqueueOrderCreatedFromRecord/);
    assert.match(orders, /notifyAfterCommerceCommit/);
    assert.match(orders, /shippingEmail: order\?\.shipping_email/);
    assert.match(quotes, /requireSupabaseAuth/);
    assert.match(quotes, /create_quote_with_items/);
    assert.match(quotes, /p_submission_nonce: data\.submissionNonce/);
    assert.match(quotes, /enqueueQuoteCreatedFromRecord/);
    assert.match(quotes, /contactEmail: quote\?\.contact_email/);
    assert.match(quotes, /export const acceptQuote/);
    assert.match(quotes, /accept_quote/);
    assert.match(quotes, /existing\.user_id !== context\.userId/);
  });

  test("admin lifecycle mutations remain staff-gated and do not enqueue from routes", () => {
    const adminOps = readFileSync(resolve(root, "src/lib/admin-ops.ts"), "utf8");
    const adminRoute = readFileSync(resolve(root, "src/routes/_authenticated/admin.tsx"), "utf8");

    assert.match(adminOps, /requireSupabaseAuth/);
    assert.match(adminOps, /loadStaffAccess/);
    assert.match(adminOps, /enqueueOrderLifecycleFromTransition/);
    assert.match(adminOps, /export const cancelOrder/);
    assert.match(adminOps, /cancel_order_and_restore_stock/);
    assert.match(adminOps, /enqueueQuoteLifecycleFromTransition/);
    assert.match(adminOps, /notifyAfterCommerceCommit/);
    assert.match(adminOps, /previousStatus: existing\.status/);
    assert.match(adminOps, /shipping_email/);
    assert.match(adminOps, /contact_email/);
    assert.match(adminOps, /if \(!access\.isAdmin\)/);
    assert.match(adminOps, /enqueueProfileApprovalFromTransition/);
    assert.match(adminOps, /auth\.admin\.getUserById/);
    assert.match(adminOps, /existing\.approval_status === data\.approvalStatus/);

    const profileFn = adminOps.slice(adminOps.indexOf("export const updateProfileApproval"));
    assert.match(profileFn, /isAdmin/);
    const orderFn = adminOps.slice(
      adminOps.indexOf("export const updateOrderStatus"),
      adminOps.indexOf("export const updateQuoteStatus"),
    );
    assert.doesNotMatch(orderFn, /isAdmin/);

    assert.equal(adminRoute.includes("@/server/mail"), false);
    assert.equal(adminRoute.includes("transactional_email_outbox"), false);
    assert.equal(adminRoute.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
    assert.match(adminRoute, /updateOrderStatus/);
    assert.match(adminRoute, /cancelOrder/);
    assert.match(adminRoute, /updateQuoteStatus/);
  });

  test("src/server is not imported from route components", () => {
    const routesDir = resolve(root, "src/routes");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name);
        if (name.isDirectory()) walk(p);
        else if (name.name.endsWith(".tsx") || name.name.endsWith(".ts")) files.push(p);
      }
    };
    walk(routesDir);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      assert.equal(text.includes("@/server/"), false, file);
      assert.equal(text.includes("src/server/"), false, file);
    }
  });
});
