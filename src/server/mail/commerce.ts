import { transactionalEventKey } from "./events.ts";
import { enqueueTransactionalEmail } from "./outbox.ts";
import type { EnqueueTransactionalEmailInput, TransactionalOutboxRow } from "./types.ts";

export const ORDER_CREATED_TEMPLATE_ID = "order-created";
export const ORDER_SHIPPED_TEMPLATE_ID = "order-shipped";
export const ORDER_CANCELLED_TEMPLATE_ID = "order-cancelled";
export const ORDER_PAYMENT_FAILED_TEMPLATE_ID = "order-payment-failed";
export const QUOTE_CREATED_TEMPLATE_ID = "quote-created";
export const QUOTE_QUOTED_TEMPLATE_ID = "quote-quoted";
export const QUOTE_DECLINED_TEMPLATE_ID = "quote-declined";
export const PROFILE_APPROVED_TEMPLATE_ID = "profile-approved";
export const PROFILE_REJECTED_TEMPLATE_ID = "profile-rejected";

export type CreatedOrderMailSource = {
  id: string;
  reference: string;
  shippingEmail: string | null;
};

export type CreatedQuoteMailSource = {
  id: string;
  reference: string;
  contactEmail: string | null;
};

export type EnqueueResult =
  | { ok: true; created: boolean; row: TransactionalOutboxRow }
  | { ok: false; skipped: string };

/**
 * Commerce already committed. Enqueue must not throw back to the customer
 * mutation: a failed outbox write must not look like a failed order/quote
 * (which would invite a retry and a duplicate commerce row).
 */
export async function notifyAfterCommerceCommit<T>(
  commerce: T,
  enqueue: () => Promise<unknown>,
): Promise<T> {
  try {
    await enqueue();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[transactional-email] enqueue after commerce commit failed:", message);
  }
  return commerce;
}

export function orderCreatedEnqueueInput(order: CreatedOrderMailSource): EnqueueTransactionalEmailInput {
  const recipientEmail = order.shippingEmail?.trim() ?? "";
  if (!recipientEmail) {
    throw new Error("order.created enqueue skipped: missing authoritative shipping_email");
  }

  return {
    eventKey: transactionalEventKey("order.created", order.id),
    eventType: "order.created",
    entityType: "order",
    entityId: order.id,
    recipientEmail,
    templateId: ORDER_CREATED_TEMPLATE_ID,
    payload: {
      reference: order.reference,
      notice: "order_received",
    },
  };
}

export function quoteCreatedEnqueueInput(quote: CreatedQuoteMailSource): EnqueueTransactionalEmailInput {
  const recipientEmail = quote.contactEmail?.trim() ?? "";
  if (!recipientEmail) {
    throw new Error("quote.created enqueue skipped: missing authoritative contact_email");
  }

  return {
    eventKey: transactionalEventKey("quote.created", quote.id),
    eventType: "quote.created",
    entityType: "quote",
    entityId: quote.id,
    recipientEmail,
    templateId: QUOTE_CREATED_TEMPLATE_ID,
    payload: {
      reference: quote.reference,
      notice: "quote_submitted",
    },
  };
}

export async function enqueueOrderCreatedFromRecord(
  order: CreatedOrderMailSource,
): Promise<EnqueueResult> {
  try {
    const result = await enqueueTransactionalEmail(orderCreatedEnqueueInput(order));
    return { ok: true, created: result.created, row: result.row };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[transactional-email] order.created enqueue failed:", message);
    throw error;
  }
}

export async function enqueueQuoteCreatedFromRecord(
  quote: CreatedQuoteMailSource,
): Promise<EnqueueResult> {
  try {
    const result = await enqueueTransactionalEmail(quoteCreatedEnqueueInput(quote));
    return { ok: true, created: result.created, row: result.row };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[transactional-email] quote.created enqueue failed:", message);
    throw error;
  }
}

export type OrderLifecycleMailSource = CreatedOrderMailSource & {
  previousStatus: string;
  nextStatus: string;
};

export type QuoteLifecycleMailSource = CreatedQuoteMailSource & {
  previousStatus: string;
  nextStatus: string;
};

export function isStatusTransition(previousStatus: string, nextStatus: string): boolean {
  return previousStatus !== nextStatus;
}

function orderLifecycleEnqueueInput(
  order: OrderLifecycleMailSource,
): EnqueueTransactionalEmailInput | null {
  if (!isStatusTransition(order.previousStatus, order.nextStatus)) return null;

  const recipientEmail = order.shippingEmail?.trim() ?? "";
  const base = {
    entityType: "order",
    entityId: order.id,
    recipientEmail,
  };

  if (order.nextStatus === "shipped") {
    if (!recipientEmail) throw new Error("order.shipped enqueue skipped: missing authoritative shipping_email");
    return {
      ...base,
      eventKey: transactionalEventKey("order.shipped", order.id),
      eventType: "order.shipped",
      templateId: ORDER_SHIPPED_TEMPLATE_ID,
      payload: { reference: order.reference, notice: "order_shipped" },
    };
  }
  if (order.nextStatus === "cancelled") {
    if (!recipientEmail) throw new Error("order.cancelled enqueue skipped: missing authoritative shipping_email");
    return {
      ...base,
      eventKey: transactionalEventKey("order.cancelled", order.id),
      eventType: "order.cancelled",
      templateId: ORDER_CANCELLED_TEMPLATE_ID,
      payload: { reference: order.reference, notice: "order_cancelled" },
    };
  }
  if (order.nextStatus === "payment_failed") {
    if (!recipientEmail) throw new Error("order.payment_failed enqueue skipped: missing authoritative shipping_email");
    return {
      ...base,
      eventKey: transactionalEventKey("order.payment_failed", order.id),
      eventType: "order.payment_failed",
      templateId: ORDER_PAYMENT_FAILED_TEMPLATE_ID,
      payload: { reference: order.reference, notice: "payment_failed" },
    };
  }
  return null;
}

function quoteLifecycleEnqueueInput(
  quote: QuoteLifecycleMailSource,
): EnqueueTransactionalEmailInput | null {
  if (!isStatusTransition(quote.previousStatus, quote.nextStatus)) return null;

  const recipientEmail = quote.contactEmail?.trim() ?? "";
  const base = {
    entityType: "quote",
    entityId: quote.id,
    recipientEmail,
  };

  if (quote.nextStatus === "quoted") {
    if (!recipientEmail) throw new Error("quote.quoted enqueue skipped: missing authoritative contact_email");
    return {
      ...base,
      eventKey: transactionalEventKey("quote.quoted", quote.id),
      eventType: "quote.quoted",
      templateId: QUOTE_QUOTED_TEMPLATE_ID,
      payload: { reference: quote.reference, notice: "quote_ready" },
    };
  }
  if (quote.nextStatus === "declined") {
    if (!recipientEmail) throw new Error("quote.declined enqueue skipped: missing authoritative contact_email");
    return {
      ...base,
      eventKey: transactionalEventKey("quote.declined", quote.id),
      eventType: "quote.declined",
      templateId: QUOTE_DECLINED_TEMPLATE_ID,
      payload: { reference: quote.reference, notice: "quote_declined" },
    };
  }
  return null;
}

export async function enqueueOrderLifecycleFromTransition(
  order: OrderLifecycleMailSource,
): Promise<EnqueueResult> {
  const input = orderLifecycleEnqueueInput(order);
  if (!input) return { ok: false, skipped: "no_mailable_transition" };
  try {
    const result = await enqueueTransactionalEmail(input);
    return { ok: true, created: result.created, row: result.row };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[transactional-email] order lifecycle enqueue failed:", message);
    throw error;
  }
}

export async function enqueueQuoteLifecycleFromTransition(
  quote: QuoteLifecycleMailSource,
): Promise<EnqueueResult> {
  const input = quoteLifecycleEnqueueInput(quote);
  if (!input) return { ok: false, skipped: "no_mailable_transition" };
  try {
    const result = await enqueueTransactionalEmail(input);
    return { ok: true, created: result.created, row: result.row };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[transactional-email] quote lifecycle enqueue failed:", message);
    throw error;
  }
}

export type ProfileApprovalMailSource = {
  id: string;
  email: string | null;
  fullName: string | null;
  previousStatus: string;
  nextStatus: string;
};

function profileApprovalEnqueueInput(
  profile: ProfileApprovalMailSource,
): EnqueueTransactionalEmailInput | null {
  if (!isStatusTransition(profile.previousStatus, profile.nextStatus)) return null;
  if (profile.nextStatus !== "approved" && profile.nextStatus !== "rejected") return null;

  const recipientEmail = profile.email?.trim() ?? "";
  if (!recipientEmail) {
    throw new Error("profile approval enqueue skipped: missing authoritative auth email");
  }

  const payload: Record<string, unknown> = {
    notice: profile.nextStatus === "approved" ? "account_approved" : "account_rejected",
  };
  const fullName = profile.fullName?.trim();
  if (fullName) payload["fullName"] = fullName;

  if (profile.nextStatus === "approved") {
    return {
      eventKey: transactionalEventKey("profile.approved", profile.id),
      eventType: "profile.approved",
      entityType: "profile",
      entityId: profile.id,
      recipientEmail,
      templateId: PROFILE_APPROVED_TEMPLATE_ID,
      payload,
    };
  }

  return {
    eventKey: transactionalEventKey("profile.rejected", profile.id),
    eventType: "profile.rejected",
    entityType: "profile",
    entityId: profile.id,
    recipientEmail,
    templateId: PROFILE_REJECTED_TEMPLATE_ID,
    payload,
  };
}

export async function enqueueProfileApprovalFromTransition(
  profile: ProfileApprovalMailSource,
): Promise<EnqueueResult> {
  const input = profileApprovalEnqueueInput(profile);
  if (!input) return { ok: false, skipped: "no_mailable_transition" };
  try {
    const result = await enqueueTransactionalEmail(input);
    return { ok: true, created: result.created, row: result.row };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[transactional-email] profile approval enqueue failed:", message);
    throw error;
  }
}
