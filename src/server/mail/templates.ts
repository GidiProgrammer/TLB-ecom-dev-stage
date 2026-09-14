import { escapeHtml } from "./html.ts";
import { MailProviderError } from "./types.ts";
import type { TransactionalEmailData } from "./types.ts";
import { subjectForTransactionalEmail } from "./policy.ts";

export const TRANSACTIONAL_TEMPLATE_IDS = [
  "order-created",
  "quote-created",
  "quote-quoted",
  "quote-declined",
  "order-shipped",
  "order-cancelled",
  "order-payment-failed",
  "profile-approved",
  "profile-rejected",
  "contact-submitted",
] as const;

export type TransactionalTemplateId = (typeof TRANSACTIONAL_TEMPLATE_IDS)[number];

export type RenderedTransactionalEmail = {
  templateId: TransactionalTemplateId;
  subject: string;
  html: string;
  text: string;
};

const BRAND = "TLB Enterprise";

function field(data: TransactionalEmailData, key: string): string | null {
  const value = data[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function wrapHtml(title: string, paragraphs: string[]): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.5;color:#1f2937;">${p}</p>`).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Georgia,Times,serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e5e7eb;padding:32px 28px;">
          <tr>
            <td>
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">${escapeHtml(BRAND)}</p>
              <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#111827;">${escapeHtml(title)}</h1>
              ${body}
              <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#6b7280;">This message was sent by ${escapeHtml(BRAND)}. If you were not expecting it, you can ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function wrapText(title: string, paragraphs: string[]): string {
  return [`${BRAND}`, title, "", ...paragraphs, "", `This message was sent by ${BRAND}.`].join("\n");
}

function referenceLine(reference: string | null, label: string): { html: string; text: string } | null {
  if (!reference) return null;
  return {
    html: `${escapeHtml(label)}: <strong>${escapeHtml(reference)}</strong>`,
    text: `${label}: ${reference}`,
  };
}

export function renderTransactionalEmail(
  templateId: string,
  data: TransactionalEmailData,
): RenderedTransactionalEmail {
  if (!(TRANSACTIONAL_TEMPLATE_IDS as readonly string[]).includes(templateId)) {
    throw new MailProviderError(`Unknown transactional email template: ${templateId}`, {
      retryable: false,
    });
  }

  const id = templateId as TransactionalTemplateId;
  const subject = subjectForTransactionalEmail(id, data);
  const reference = field(data, "reference");
  const fullName = field(data, "fullName");
  const greetingHtml = fullName ? `Hello ${escapeHtml(fullName)},` : "Hello,";
  const greetingText = fullName ? `Hello ${fullName},` : "Hello,";

  const { htmlParagraphs, textParagraphs } = contentForTemplate(id, data, reference, greetingHtml, greetingText);

  return {
    templateId: id,
    subject,
    html: wrapHtml(subject, htmlParagraphs),
    text: wrapText(subject, textParagraphs),
  };
}

function contentForTemplate(
  templateId: TransactionalTemplateId,
  data: TransactionalEmailData,
  reference: string | null,
  greetingHtml: string,
  greetingText: string,
): { htmlParagraphs: string[]; textParagraphs: string[] } {
  const html: string[] = [greetingHtml];
  const text: string[] = [greetingText];

  const push = (htmlLine: string, textLine: string) => {
    html.push(htmlLine);
    text.push(textLine);
  };

  const ref = referenceLine(reference, templateId.startsWith("quote") ? "Quote reference" : "Order reference");

  switch (templateId) {
    case "order-created":
      push(
        "We have recorded your order with TLB Enterprise. This confirms that the order was created — it does not mean an online payment was received.",
        "We have recorded your order with TLB Enterprise. This confirms that the order was created — it does not mean an online payment was received.",
      );
      if (ref) push(ref.html, ref.text);
      push("You can review the order in your account. Our team will follow up if anything else is needed.", "You can review the order in your account. Our team will follow up if anything else is needed.");
      break;
    case "quote-created":
      push(
        "We have received your quote request. A member of the TLB Enterprise team will review it.",
        "We have received your quote request. A member of the TLB Enterprise team will review it.",
      );
      if (ref) push(ref.html, ref.text);
      push("This is an acknowledgement of the request, not a priced quotation.", "This is an acknowledgement of the request, not a priced quotation.");
      break;
    case "quote-quoted":
      push(
        "Staff have recorded quoted item prices for your request. This is not an invoice and not a payment total.",
        "Staff have recorded quoted item prices for your request. This is not an invoice and not a payment total.",
      );
      if (ref) push(ref.html, ref.text);
      push("Sign in to your account to review the quotation and next steps.", "Sign in to your account to review the quotation and next steps.");
      break;
    case "quote-declined":
      push("Your quote request was declined.", "Your quote request was declined.");
      if (ref) push(ref.html, ref.text);
      push("If you still need supplies, reply to this email or submit a new request.", "If you still need supplies, reply to this email or submit a new request.");
      break;
    case "order-shipped":
      push("Your order has been marked as dispatched.", "Your order has been marked as dispatched.");
      if (ref) push(ref.html, ref.text);
      push("If you have questions about delivery, reply to this message or contact TLB Enterprise.", "If you have questions about delivery, reply to this message or contact TLB Enterprise.");
      break;
    case "order-cancelled":
      push("Your order was cancelled.", "Your order was cancelled.");
      if (ref) push(ref.html, ref.text);
      push("If you did not expect this, contact TLB Enterprise and quote the reference above.", "If you did not expect this, contact TLB Enterprise and quote the reference above.");
      break;
    case "order-payment-failed":
      push(
        "The payment status on this order was marked as failed. This is a status notice only.",
        "The payment status on this order was marked as failed. This is a status notice only.",
      );
      if (ref) push(ref.html, ref.text);
      push("Contact TLB Enterprise if you need help completing the order.", "Contact TLB Enterprise if you need help completing the order.");
      break;
    case "profile-approved":
      push(
        "Your TLB Enterprise account was approved. This is an account notice only and does not change catalogue prices or purchasing rights by itself.",
        "Your TLB Enterprise account was approved. This is an account notice only and does not change catalogue prices or purchasing rights by itself.",
      );
      push("You can sign in and continue using your account.", "You can sign in and continue using your account.");
      break;
    case "profile-rejected":
      push(
        "Your TLB Enterprise account was not approved. This is an account notice only.",
        "Your TLB Enterprise account was not approved. This is an account notice only.",
      );
      push("If you believe this is a mistake, contact TLB Enterprise.", "If you believe this is a mistake, contact TLB Enterprise.");
      break;
    case "contact-submitted": {
      const name = field(data, "name") ?? "Unknown";
      const email = field(data, "email") ?? "unknown";
      const message = field(data, "message") ?? "";
      const phone = field(data, "phone");
      const institution = field(data, "institution");
      const enquiryId = field(data, "enquiryId");
      push("A website enquiry was submitted.", "A website enquiry was submitted.");
      if (enquiryId) {
        push(`Enquiry id: ${escapeHtml(enquiryId)}`, `Enquiry id: ${enquiryId}`);
      }
      push(`Name: ${escapeHtml(name)}`, `Name: ${name}`);
      push(`Email: ${escapeHtml(email)}`, `Email: ${email}`);
      if (phone) push(`Phone: ${escapeHtml(phone)}`, `Phone: ${phone}`);
      if (institution) push(`Institution: ${escapeHtml(institution)}`, `Institution: ${institution}`);
      push(`Message:<br>${escapeHtml(message).replaceAll("\n", "<br>")}`, `Message:\n${message}`);
      push("Reply to the customer using the Reply-To address on this message.", "Reply to the customer using the Reply-To address on this message.");
      break;
    }
  }

  return { htmlParagraphs: html, textParagraphs: text };
}
