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
