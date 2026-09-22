export type LineItem = { id: string; qty: number };

function emptyCommerce(): { cart: LineItem[]; quote: LineItem[] } {
  return { cart: [], quote: [] };
}

/** Keep only lines the storefront can render. Client storage is not price or stock authority. */
export function sanitizeCommerceLines(value: unknown): LineItem[] {
  if (!Array.isArray(value)) return [];
  const lines: LineItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const id = (entry as { id?: unknown }).id;
    const qty = (entry as { qty?: unknown }).qty;
    if (typeof id !== "string" || id.trim().length === 0) continue;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) continue;
    lines.push({ id, qty });
  }
  return lines;
}

export function parseStoredCommerce(raw: string | null): { cart: LineItem[]; quote: LineItem[] } {
  if (!raw) return emptyCommerce();
  try {
    const parsed = JSON.parse(raw) as { cart?: unknown; quote?: unknown } | null;
    if (!parsed || typeof parsed !== "object") return emptyCommerce();
    return {
      cart: sanitizeCommerceLines(parsed.cart),
      quote: sanitizeCommerceLines(parsed.quote),
    };
  } catch {
    return emptyCommerce();
  }
}
