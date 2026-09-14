import type { Enums } from "@/integrations/supabase/types";

export type OrderStatus = Enums<"order_status">;
export type QuoteStatus = Enums<"quote_status">;

const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["paid", "processing"],
  paid: ["processing"],
  processing: ["shipped"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
  payment_failed: [],
};

const CANCELLABLE_ORDER_STATUSES: readonly OrderStatus[] = ["pending", "paid", "processing"];

/**
 * Quote graph. `submitted → quoted` and `submitted → declined` stay valid
 * because CP26 already mails those transitions and the admin UI used them.
 * `accepted` is terminal status-only — it does not create an order.
 */
const QUOTE_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  submitted: ["reviewed", "quoted", "declined"],
  reviewed: ["quoted", "declined"],
  quoted: ["accepted", "declined"],
  accepted: [],
  declined: [],
};

export function isSameStatus<T extends string>(from: T, to: T) {
  return from === to;
}

export function allowedOrderTransitions(from: OrderStatus): readonly OrderStatus[] {
  return ORDER_TRANSITIONS[from];
}

export function isOrderCancellable(status: OrderStatus) {
  return CANCELLABLE_ORDER_STATUSES.includes(status);
}

export function isValidOrderTransition(from: OrderStatus, to: OrderStatus) {
  if (to === "cancelled") return false;
  return ORDER_TRANSITIONS[from].includes(to);
}

export function assertValidOrderTransition(from: OrderStatus, to: OrderStatus) {
  if (isSameStatus(from, to)) return;
  if (to === "cancelled") {
    throw new Error("Cancel this order with the dedicated cancel action");
  }
  if (to === "payment_failed") {
    throw new Error("That status is not used while payment is arranged offline");
  }
  if (!isValidOrderTransition(from, to)) {
    throw new Error("Invalid order status transition");
  }
}

export function allowedQuoteTransitions(from: QuoteStatus): readonly QuoteStatus[] {
  return QUOTE_TRANSITIONS[from];
}

export function isValidQuoteTransition(from: QuoteStatus, to: QuoteStatus) {
  return QUOTE_TRANSITIONS[from].includes(to);
}

export function assertValidQuoteTransition(from: QuoteStatus, to: QuoteStatus) {
  if (isSameStatus(from, to)) return;
  if (!isValidQuoteTransition(from, to)) {
    throw new Error("Invalid quote status transition");
  }
}

export function isTerminalOrderStatus(status: OrderStatus) {
  return status === "cancelled" || status === "completed";
}

export function isTerminalQuoteStatus(status: QuoteStatus) {
  return status === "accepted" || status === "declined";
}
