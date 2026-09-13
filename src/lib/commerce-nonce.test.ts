import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  clearSubmissionNonce,
  getOrCreateSubmissionNonce,
  isSubmissionNonce,
  ORDER_SUBMISSION_NONCE_KEY,
  QUOTE_SUBMISSION_NONCE_KEY,
} from "./commerce-nonce.ts";

const memory = new Map<string, string>();

afterEach(() => {
  memory.clear();
});

describe("commerce submission nonce", () => {
  test("getOrCreate reuses the stored nonce until cleared", () => {
    const localStorage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    };
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage },
    });

    const first = getOrCreateSubmissionNonce("order");
    const second = getOrCreateSubmissionNonce("order");
    assert.equal(isSubmissionNonce(first), true);
    assert.equal(second, first);
    assert.equal(memory.get(ORDER_SUBMISSION_NONCE_KEY), first);

    const quote = getOrCreateSubmissionNonce("quote");
    assert.notEqual(quote, first);
    assert.equal(memory.get(QUOTE_SUBMISSION_NONCE_KEY), quote);

    clearSubmissionNonce("order");
    const third = getOrCreateSubmissionNonce("order");
    assert.notEqual(third, first);
  });
});
