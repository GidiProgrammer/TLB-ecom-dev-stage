export const MAIL_MAX_ATTEMPTS = 5;
export const MAIL_STALE_SENDING_MS = 10 * 60 * 1000;
export const MAIL_BACKOFF_BASE_MS = 60_000;
export const MAIL_BACKOFF_CAP_MS = 15 * 60 * 1000;

/** Delay after a failed attempt (`attemptCount` is the count after this claim). */
export function backoffMsAfterAttempt(attemptCount: number): number {
  if (attemptCount < 1) return MAIL_BACKOFF_BASE_MS;
  return Math.min(MAIL_BACKOFF_BASE_MS * 2 ** (attemptCount - 1), MAIL_BACKOFF_CAP_MS);
}

export function nextAttemptAtAfterFailure(attemptCount: number, now: Date): Date {
  return new Date(now.getTime() + backoffMsAfterAttempt(attemptCount));
}

export function subjectForTransactionalEmail(
  templateId: string,
  payload: Record<string, unknown>,
): string {
  const reference = typeof payload["reference"] === "string" ? payload["reference"] : null;
  if (templateId === "order-created") {
    return reference ? `We received your order ${reference}` : "We received your order";
  }
  if (templateId === "quote-created") {
    return reference ? `We received your quote request ${reference}` : "We received your quote request";
  }
  if (templateId === "quote-quoted") {
    return reference ? `Your quotation ${reference} is ready` : "Your quotation is ready";
  }
  if (templateId === "quote-declined") {
    return reference ? `Update on quote request ${reference}` : "Update on your quote request";
  }
  if (templateId === "order-shipped") {
    return reference ? `Order ${reference} has been dispatched` : "Your order has been dispatched";
  }
  if (templateId === "order-cancelled") {
    return reference ? `Order ${reference} was cancelled` : "Your order was cancelled";
  }
  if (templateId === "order-payment-failed") {
    return reference ? `Update on order ${reference}` : "Update on your order";
  }
  if (templateId === "profile-approved") {
    return "Your TLB Enterprise account was approved";
  }
  if (templateId === "profile-rejected") {
    return "Update on your TLB Enterprise account";
  }
  if (templateId === "contact-submitted") {
    return "Website enquiry";
  }
  return reference ? `TLB Enterprise update ${reference}` : "TLB Enterprise update";
}
