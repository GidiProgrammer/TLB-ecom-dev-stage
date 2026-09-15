/**
 * URL-safe commerce references (TLB-YYYYMMDD-XXXXXX / QT-YYYYMMDD-XXXXXX).
 * Rejects anything that is not a same-origin confirmation path.
 */

const ORDER_REFERENCE = /^TLB-\d{8}-[A-F0-9]{6}$/;
const QUOTE_REFERENCE = /^QT-\d{8}-[A-F0-9]{6}$/;

export type CommerceKind = "order" | "quote";

export function parseOrderReference(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ref = value.trim().toUpperCase();
  return ORDER_REFERENCE.test(ref) ? ref : null;
}

export function parseQuoteReference(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ref = value.trim().toUpperCase();
  return QUOTE_REFERENCE.test(ref) ? ref : null;
}

export function parseCommerceReference(kind: CommerceKind, value: unknown): string | null {
  return kind === "order" ? parseOrderReference(value) : parseQuoteReference(value);
}

export function commerceConfirmationPath(kind: CommerceKind, reference: string): string | null {
  const parsed = parseCommerceReference(kind, reference);
  if (!parsed) return null;
  const pathname = kind === "order" ? "/checkout/confirmed" : "/quote/confirmed";
  return `${pathname}?ref=${encodeURIComponent(parsed)}`;
}

export function parseConfirmationSearch(kind: CommerceKind, search: Record<string, unknown>): { ref?: string } {
  const parsed = parseCommerceReference(kind, search["ref"]);
  return parsed ? { ref: parsed } : {};
}
