const PREFIX = "tlb-form-draft:";

export function readFormDraft<T extends Record<string, string>>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return fallback;
    const next = { ...fallback };
    for (const field of Object.keys(fallback) as (keyof T)[]) {
      const value = (parsed as Record<string, unknown>)[String(field)];
      if (typeof value === "string") next[field] = value as T[keyof T];
    }
    return next;
  } catch {
    return fallback;
  }
}

export function writeFormDraft(key: string, value: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // quota / private mode
  }
}

export function clearFormDraft(key: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}
