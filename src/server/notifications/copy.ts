import { safeInternalPath } from "../../lib/safe-redirect.ts";
import type { CustomerNotificationEventType } from "./events.ts";

export type CustomerNotificationCopy = {
  title: string;
  body: string;
  targetType: "order" | "quote" | "profile";
  href: string;
};

function orderHref(reference: string): string {
  return safeInternalPath(`/account?tab=orders&ref=${encodeURIComponent(reference)}`);
}

function quoteHref(reference: string): string {
  return safeInternalPath(`/account?tab=quotes&ref=${encodeURIComponent(reference)}`);
}

export function customerNotificationCopy(
  eventType: CustomerNotificationEventType,
  reference: string,
): CustomerNotificationCopy {
  switch (eventType) {
    case "order.created":
      return {
        title: "Order received",
        body: `We have recorded order ${reference}. This does not mean online payment succeeded.`,
        targetType: "order",
        href: orderHref(reference),
      };
    case "order.shipped":
      return {
        title: "Order shipped",
        body: `Order ${reference} is marked as shipped.`,
        targetType: "order",
        href: orderHref(reference),
      };
    case "order.cancelled":
      return {
        title: "Order cancelled",
        body: `Order ${reference} has been cancelled.`,
        targetType: "order",
        href: orderHref(reference),
      };
    case "order.payment_failed":
      return {
        title: "Payment unsuccessful",
        body: `Payment for order ${reference} was marked unsuccessful.`,
        targetType: "order",
        href: orderHref(reference),
      };
    case "quote.submitted":
      return {
        title: "Quote request submitted",
        body: `We have received quote request ${reference}.`,
        targetType: "quote",
        href: quoteHref(reference),
      };
    case "quote.quoted":
      return {
        title: "Quote ready",
        body: `Quoted prices are ready for ${reference}. This is not an invoice.`,
        targetType: "quote",
        href: quoteHref(reference),
      };
    case "quote.declined":
      return {
        title: "Quote declined",
        body: `Quote request ${reference} was declined.`,
        targetType: "quote",
        href: quoteHref(reference),
      };
    case "profile.approved":
      return {
        title: "Account approved",
        body: "Your account has been approved. This is an account notice only.",
        targetType: "profile",
        href: "/account",
      };
    case "profile.rejected":
      return {
        title: "Account not approved",
        body: "Your account was not approved. This is an account notice only.",
        targetType: "profile",
        href: "/account",
      };
  }
}
