export type QuantityCommit = { status: "unchanged" } | { status: "update"; quantity: number } | { status: "too-high" };

/**
 * Interpret a quantity field while the customer is editing.
 * Empty, zero, and non-integers keep the current line. They do not remove it.
 */
export function interpretLineQuantity(raw: string, current: number, max?: number): QuantityCommit {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return { status: "unchanged" };
  const next = Number(trimmed);
  if (!Number.isInteger(next) || next < 1) return { status: "unchanged" };
  if (max != null && next > max) return { status: "too-high" };
  if (next === current) return { status: "unchanged" };
  return { status: "update", quantity: next };
}
