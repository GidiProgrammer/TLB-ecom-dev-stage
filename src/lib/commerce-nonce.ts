const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ORDER_SUBMISSION_NONCE_KEY = "tlb-order-submission-nonce";
export const QUOTE_SUBMISSION_NONCE_KEY = "tlb-quote-submission-nonce";

export type CommerceSubmissionOperation = "order" | "quote";

function storageKey(operation: CommerceSubmissionOperation) {
  return operation === "order" ? ORDER_SUBMISSION_NONCE_KEY : QUOTE_SUBMISSION_NONCE_KEY;
}

export function isSubmissionNonce(value: string): boolean {
  return UUID_RE.test(value);
}

function newNonce(): string {
  return crypto.randomUUID();
}

function readStoredNonce(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw && isSubmissionNonce(raw)) return raw;
    return null;
  } catch {
    return null;
  }
}

function writeStoredNonce(key: string, nonce: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, nonce);
  } catch {
    // Private mode / quota: caller still holds the in-memory nonce for this attempt.
  }
}

/** Persist (or reuse) a UUID nonce for one intentional checkout/quote submit. */
export function getOrCreateSubmissionNonce(operation: CommerceSubmissionOperation): string {
  const key = storageKey(operation);
  const existing = readStoredNonce(key);
  if (existing) return existing;
  const nonce = newNonce();
  writeStoredNonce(key, nonce);
  return nonce;
}

/** Call only after the server confirmed success (including idempotent replay). */
export function clearSubmissionNonce(operation: CommerceSubmissionOperation) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(operation));
  } catch {
    // ignore
  }
}
