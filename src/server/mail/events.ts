/**
 * CP26 customer commerce email events.
 * See docs/TRANSACTIONAL_EMAIL.md.
 *
 * Phase 2A wires order.created and quote.created after the commerce RPC commits.
 * Phase 3B wires profile.approved / profile.rejected on admin approval_status
 * transitions only. Those notices do not grant CP22 purchasing or quote rights.
 * profile.approved / profile.rejected are account-approval notices only —
 * they must not imply CP22 institutional purchasing or quote rights.
 * quote.quoted is staff quoted prices, not an invoice or payment total.
 * order.created does not mean online payment occurred.
 * contact.submitted is an inbound enquiry to TLB staff, not a customer commerce notice.
 */

export const TRANSACTIONAL_EVENT_TYPES = [
  "order.created",
  "quote.created",
  "quote.quoted",
  "quote.declined",
  "profile.approved",
  "profile.rejected",
  "order.shipped",
  "order.cancelled",
  "order.payment_failed",
  "contact.submitted",
] as const;

export type TransactionalEventType = (typeof TRANSACTIONAL_EVENT_TYPES)[number];

export function transactionalEventKey(
  eventType: TransactionalEventType,
  entityId: string,
): string {
  switch (eventType) {
    case "order.created":
      return `order.created:${entityId}`;
    case "quote.created":
      return `quote.created:${entityId}`;
    case "quote.quoted":
      return `quote.status:${entityId}:quoted`;
    case "quote.declined":
      return `quote.status:${entityId}:declined`;
    case "profile.approved":
      return `profile.approval:${entityId}:approved`;
    case "profile.rejected":
      return `profile.approval:${entityId}:rejected`;
    case "order.shipped":
      return `order.shipped:${entityId}`;
    case "order.cancelled":
      return `order.cancelled:${entityId}`;
    case "order.payment_failed":
      return `order.payment_failed:${entityId}`;
    case "contact.submitted":
      return `contact.submitted:${entityId}`;
  }
}
