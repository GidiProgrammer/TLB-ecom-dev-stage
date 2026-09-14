/**
 * Accept only same-origin relative paths for post-auth navigation.
 * Rejects absolute URLs, protocol-relative URLs, and other open-redirect shapes.
 */
export function safeInternalPath(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string" || value.length === 0) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  if (trimmed.includes("://")) return fallback;
  if (/[\r\n]/.test(trimmed)) return fallback;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed.slice(1))) return fallback;

  try {
    const resolved = new URL(trimmed, "https://tlb.internal");
    if (resolved.origin !== "https://tlb.internal") return fallback;
    if (!resolved.pathname.startsWith("/")) return fallback;
    if (resolved.pathname.startsWith("//")) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}` || fallback;
  } catch {
    return fallback;
  }
}

export function parseRedirectSearch(search: Record<string, unknown>): string | undefined {
  const raw = search["redirect"];
  if (typeof raw !== "string" || !raw) return undefined;
  const safe = safeInternalPath(raw, "");
  return safe || undefined;
}
