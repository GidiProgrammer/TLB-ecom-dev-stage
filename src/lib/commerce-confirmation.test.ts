import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  commerceConfirmationPath,
  parseConfirmationSearch,
  parseOrderReference,
  parseQuoteReference,
} from "./commerce-confirmation.ts";
import { parseRedirectSearch, safeInternalPath } from "./safe-redirect.ts";

describe("commerce confirmation references", () => {
  test("accepts live order and quote reference shapes", () => {
    assert.equal(parseOrderReference("tlb-20260915-ab12cd"), "TLB-20260915-AB12CD");
    assert.equal(parseQuoteReference("QT-20260915-FF00AA"), "QT-20260915-FF00AA");
  });

  test("rejects missing, injected, and open-redirect values", () => {
    assert.equal(parseOrderReference(undefined), null);
    assert.equal(parseOrderReference(""), null);
    assert.equal(parseOrderReference("https://evil.example"), null);
    assert.equal(parseOrderReference("//evil.example"), null);
    assert.equal(parseOrderReference("TLB-20260915-AB12CD/../../etc"), null);
    assert.equal(parseQuoteReference("TLB-20260915-AB12CD"), null);
    assert.equal(parseOrderReference("QT-20260915-AB12CD"), null);
  });

  test("builds same-origin confirmation paths only for valid references", () => {
    assert.equal(
      commerceConfirmationPath("order", "TLB-20260915-AB12CD"),
      "/checkout/confirmed?ref=TLB-20260915-AB12CD",
    );
    assert.equal(
      commerceConfirmationPath("quote", "QT-20260915-CD34EF"),
      "/quote/confirmed?ref=QT-20260915-CD34EF",
    );
    assert.equal(commerceConfirmationPath("order", "https://evil.example"), null);
  });

  test("confirmation search ignores unsafe refs", () => {
    assert.deepEqual(parseConfirmationSearch("order", { ref: "TLB-20260915-AB12CD" }), {
      ref: "TLB-20260915-AB12CD",
    });
    assert.deepEqual(parseConfirmationSearch("order", { ref: "https://evil.example" }), {});
    assert.deepEqual(parseConfirmationSearch("quote", {}), {});
  });

  test("auth redirect search accepts confirmation URLs and rejects open redirects", () => {
    const orderPath = commerceConfirmationPath("order", "TLB-20260915-AB12CD");
    assert.equal(safeInternalPath(orderPath), orderPath);
    assert.equal(parseRedirectSearch({ redirect: orderPath }), orderPath);
    assert.equal(parseRedirectSearch({ redirect: "https://evil.example/checkout/confirmed" }), undefined);
  });
});
