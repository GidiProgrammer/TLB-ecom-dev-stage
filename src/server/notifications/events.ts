export const CUSTOMER_NOTIFICATION_EVENT_TYPES = [
  "order.created",
  "order.shipped",
  "order.cancelled",
  "order.payment_failed",
  "quote.submitted",
  "quote.quoted",
  "quote.declined",
  "profile.approved",
  "profile.rejected",
] as const;

export type CustomerNotificationEventType = (typeof CUSTOMER_NOTIFICATION_EVENT_TYPES)[number];

export function customerNotificationEventKey(
  eventType: CustomerNotificationEventType,
  entityId: string,
): string {
  switch (eventType) {
    case "order.created":
      return `order.created:${entityId}`;
    case "order.shipped":
      return `order.shipped:${entityId}`;
    case "order.cancelled":
      return `order.cancelled:${entityId}`;
    case "order.payment_failed":
      return `order.payment_failed:${entityId}`;
    case "quote.submitted":
      return `quote.submitted:${entityId}`;
    case "quote.quoted":
      return `quote.status:${entityId}:quoted`;
    case "quote.declined":
      return `quote.status:${entityId}:declined`;
    case "profile.approved":
      return `profile.approval:${entityId}:approved`;
    case "profile.rejected":
      return `profile.approval:${entityId}:rejected`;
  }
}

export function isCustomerNotificationEventType(value: string): value is CustomerNotificationEventType {
  return (CUSTOMER_NOTIFICATION_EVENT_TYPES as readonly string[]).includes(value);
}
