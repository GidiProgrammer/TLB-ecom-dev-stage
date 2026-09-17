import { customerNotificationCopy } from "./copy.ts";
import { customerNotificationEventKey, type CustomerNotificationEventType } from "./events.ts";
import { createCustomerNotification } from "./store.ts";

export type NotificationCreateResult =
  | { ok: true; created: boolean }
  | { ok: false; skipped: string };

type OrderSource = {
  id: string;
  userId: string | null;
  reference: string;
  previousStatus?: string;
  nextStatus?: string;
};

type QuoteSource = {
  id: string;
  userId: string | null;
  reference: string;
  previousStatus?: string;
  nextStatus?: string;
};

type ProfileSource = {
  id: string;
  previousStatus: string;
  nextStatus: string;
};

function isStatusTransition(previousStatus: string | undefined, nextStatus: string | undefined): boolean {
  if (!previousStatus || !nextStatus) return false;
  return previousStatus !== nextStatus;
}

async function createTyped(
  eventType: CustomerNotificationEventType,
  userId: string,
  entityId: string,
  reference: string,
): Promise<NotificationCreateResult> {
  const copy = customerNotificationCopy(eventType, reference);
  const result = await createCustomerNotification({
    userId,
    eventKey: customerNotificationEventKey(eventType, entityId),
    eventType,
    title: copy.title,
    body: copy.body,
    targetType: copy.targetType,
    targetId: entityId,
    href: copy.href,
  });
  return { ok: true, created: result.created };
}

export async function createOrderCreatedNotification(order: OrderSource): Promise<NotificationCreateResult> {
  if (!order.userId) return { ok: false, skipped: "missing_user" };
  return createTyped("order.created", order.userId, order.id, order.reference);
}

export async function createOrderLifecycleNotification(order: OrderSource): Promise<NotificationCreateResult> {
  if (!isStatusTransition(order.previousStatus, order.nextStatus)) {
    return { ok: false, skipped: "no_notification_transition" };
  }
  if (!order.userId) return { ok: false, skipped: "missing_user" };

  if (order.nextStatus === "shipped") {
    return createTyped("order.shipped", order.userId, order.id, order.reference);
  }
  if (order.nextStatus === "cancelled") {
    return createTyped("order.cancelled", order.userId, order.id, order.reference);
  }
  if (order.nextStatus === "payment_failed") {
    return createTyped("order.payment_failed", order.userId, order.id, order.reference);
  }
  return { ok: false, skipped: "no_notification_transition" };
}

export async function createQuoteSubmittedNotification(quote: QuoteSource): Promise<NotificationCreateResult> {
  if (!quote.userId) return { ok: false, skipped: "missing_user" };
  return createTyped("quote.submitted", quote.userId, quote.id, quote.reference);
}

export async function createQuoteLifecycleNotification(quote: QuoteSource): Promise<NotificationCreateResult> {
  if (!isStatusTransition(quote.previousStatus, quote.nextStatus)) {
    return { ok: false, skipped: "no_notification_transition" };
  }
  if (!quote.userId) return { ok: false, skipped: "missing_user" };

  if (quote.nextStatus === "quoted") {
    return createTyped("quote.quoted", quote.userId, quote.id, quote.reference);
  }
  if (quote.nextStatus === "declined") {
    return createTyped("quote.declined", quote.userId, quote.id, quote.reference);
  }
  return { ok: false, skipped: "no_notification_transition" };
}

export async function createProfileApprovalNotification(
  profile: ProfileSource,
): Promise<NotificationCreateResult> {
  if (!isStatusTransition(profile.previousStatus, profile.nextStatus)) {
    return { ok: false, skipped: "no_notification_transition" };
  }
  if (profile.nextStatus === "approved") {
    return createTyped("profile.approved", profile.id, profile.id, "account");
  }
  if (profile.nextStatus === "rejected") {
    return createTyped("profile.rejected", profile.id, profile.id, "account");
  }
  return { ok: false, skipped: "no_notification_transition" };
}

export type AfterCommerceCommitTask = {
  channel: "transactional-email" | "customer-notifications";
  run: () => Promise<unknown>;
};

/**
 * Run independent post-commit side effects. Failures are logged per channel
 * and do not propagate to the commerce caller.
 */
export async function runAfterCommerceCommit(tasks: AfterCommerceCommitTask[]): Promise<void> {
  const results = await Promise.allSettled(tasks.map((task) => task.run()));
  results.forEach((result, index) => {
    if (result.status !== "rejected") return;
    const channel = tasks[index]?.channel ?? "customer-notifications";
    const prefix =
      channel === "transactional-email" ? "[transactional-email]" : "[customer-notifications]";
    const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
    console.error(`${prefix} post-commit side effect failed:`, message);
  });
}
