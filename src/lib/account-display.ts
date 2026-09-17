import type { AccountProfile } from "@/lib/queries/account";
import type { Enums } from "@/integrations/supabase/types";

export function accountTypeLabel(accountType: AccountProfile["account_type"] | undefined) {
  if (accountType === "institutional") return "Institutional";
  if (accountType === "individual") return "Individual";
  return "Account";
}

/** Human-readable approval copy. Does not describe purchase or quote permissions. */
export function approvalPresentation(profile: Pick<AccountProfile, "account_type" | "approval_status">) {
  const type = accountTypeLabel(profile.account_type);
  if (profile.account_type === "individual") {
    if (profile.approval_status === "approved") return `${type} — Approved`;
    if (profile.approval_status === "rejected") return `${type} — Not approved`;
    return `${type} — Under review`;
  }
  if (profile.approval_status === "approved") return `${type} — Approved`;
  if (profile.approval_status === "rejected") return `${type} — Not approved`;
  return `${type} — Under review`;
}

export function orderStatusLabel(status: Enums<"order_status">) {
  switch (status) {
    case "pending":
      return "Awaiting confirmation";
    case "paid":
      return "Confirmed";
    case "processing":
      return "Being prepared";
    case "shipped":
      return "Dispatched";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "payment_failed":
      return "Needs attention";
    default:
      return "In progress";
  }
}

/** Extra customer copy for uncommon statuses. Does not describe online checkout. */
export function orderStatusExplanation(status: Enums<"order_status">) {
  if (status === "payment_failed") {
    return "This order needs attention. Please contact TLB.";
  }
  return null;
}

export function quoteStatusLabel(status: Enums<"quote_status">) {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "reviewed":
      return "Under review";
    case "quoted":
      return "Price provided";
    case "accepted":
      return "Accepted";
    case "declined":
      return "Declined";
    default:
      return "In progress";
  }
}

/** Extra customer copy. Does not describe warehouse, delivery, or payment. */
export function quoteStatusExplanation(status: Enums<"quote_status">) {
  switch (status) {
    case "submitted":
      return "We have received this request. Quoted prices are not shown yet.";
    case "reviewed":
      return "Our team is reviewing this request. Quoted prices will appear here when they are ready.";
    case "quoted":
      return "Quoted prices are ready for your review. This is an estimate, not an invoice.";
    case "accepted":
      return "You have accepted these quoted prices. Acceptance does not create an order.";
    case "declined":
      return "This quotation was declined.";
    default:
      return null;
  }
}

export function quoteLineEstimate(quantity: number, quotedPrice: number | null | undefined): number | null {
  if (quotedPrice == null) return null;
  return Number(quotedPrice) * quantity;
}

export function quoteQuotedTotal(
  items: ReadonlyArray<{ quantity: number; quoted_price: number | null }>,
): number | null {
  if (!items.length) return null;
  let total = 0;
  for (const item of items) {
    const line = quoteLineEstimate(item.quantity, item.quoted_price);
    if (line == null) return null;
    total += line;
  }
  return total;
}
