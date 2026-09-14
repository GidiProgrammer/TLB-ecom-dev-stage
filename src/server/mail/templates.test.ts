import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { renderTransactionalEmail, TRANSACTIONAL_TEMPLATE_IDS } from "./templates.ts";
import { MailProviderError } from "./types.ts";
import { escapeHtml } from "./html.ts";

const payloads: Record<(typeof TRANSACTIONAL_TEMPLATE_IDS)[number], Record<string, unknown>> = {
  "order-created": { reference: "TLB-1001", notice: "order_received" },
  "quote-created": { reference: "QT-1001", notice: "quote_submitted" },
  "quote-quoted": { reference: "QT-1001", notice: "quote_ready" },
  "quote-declined": { reference: "QT-1001", notice: "quote_declined" },
  "order-shipped": { reference: "TLB-1001", notice: "order_shipped" },
  "order-cancelled": { reference: "TLB-1001", notice: "order_cancelled" },
  "order-payment-failed": { reference: "TLB-1001", notice: "payment_failed" },
  "profile-approved": { notice: "account_approved", fullName: "Ama Mensah" },
  "profile-rejected": { notice: "account_rejected", fullName: "Ama Mensah" },
  "contact-submitted": {
    enquiryId: "enq-1",
    name: "Ama Mensah",
    email: "ama@example.test",
    message: "Need stock",
    phone: "0240000000",
    institution: "Lab One",
  },
};

describe("transactional templates", () => {
  for (const templateId of TRANSACTIONAL_TEMPLATE_IDS) {
    test(`${templateId} returns html, plaintext, and required data`, () => {
      const rendered = renderTransactionalEmail(templateId, payloads[templateId]);
      assert.match(rendered.html, /<!DOCTYPE html>/);
      assert.match(rendered.html, /TLB Enterprise/);
      assert.ok(rendered.text.includes("TLB Enterprise"));
      assert.doesNotMatch(rendered.text, /<html|<p |<\/p>|<strong|<br/i);

      if (templateId.startsWith("order") || templateId.startsWith("quote")) {
        assert.match(rendered.html, /TLB-1001|QT-1001/);
        assert.match(rendered.text, /TLB-1001|QT-1001/);
      }
      if (templateId.startsWith("profile")) {
        assert.match(rendered.html, /Ama Mensah/);
        assert.match(rendered.text, /Ama Mensah/);
      }
      if (templateId === "contact-submitted") {
        assert.match(rendered.html, /Need stock/);
        assert.match(rendered.text, /Need stock/);
        assert.match(rendered.html, /ama@example.test/);
      }
    });
  }

  test("unknown template fails clearly", () => {
    assert.throws(
      () => renderTransactionalEmail("quote-accepted", {}),
      (error: unknown) => error instanceof MailProviderError && error.retryable === false,
    );
  });
});

describe("HTML escaping", () => {
  test("escapes script tags, attributes, quotes, and ampersands", () => {
    const rendered = renderTransactionalEmail("contact-submitted", {
      name: `Ama "Lab" & Co`,
      email: `ama@example.test" onclick="alert(1)`,
      message: `<script>alert("xss")</script><img src=x onerror="alert(1)">`,
      enquiryId: "enq-<id>",
    });

    assert.equal(rendered.html.includes("<script>"), false);
    assert.match(rendered.html, /&lt;script&gt;/);
    assert.match(rendered.html, /onclick=&quot;alert\(1\)/);
    assert.match(rendered.html, /Ama &quot;Lab&quot; &amp; Co/);
    assert.match(rendered.html, /enq-&lt;id&gt;/);
    assert.doesNotMatch(rendered.text, /<html|<p |<\/p>|<strong|<br/i);
    assert.match(rendered.text, /<script>alert/);
  });

  test("escapeHtml encodes markup", () => {
    assert.equal(escapeHtml(`<a href="x">`), `&lt;a href=&quot;x&quot;&gt;`);
  });
});
