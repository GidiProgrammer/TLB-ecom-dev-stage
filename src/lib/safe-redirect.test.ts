import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseRedirectSearch, safeInternalPath } from "./safe-redirect.ts";

describe("safeInternalPath", () => {
  test("accepts internal paths", () => {
    assert.equal(safeInternalPath("/checkout"), "/checkout");
    assert.equal(safeInternalPath("/quote"), "/quote");
    assert.equal(safeInternalPath("/account"), "/account");
    assert.equal(safeInternalPath("/shop?q=methanol"), "/shop?q=methanol");
  });

  test("rejects absolute, protocol-relative, and script URLs", () => {
    assert.equal(safeInternalPath("https://evil.example"), "/account");
    assert.equal(safeInternalPath("//evil.example"), "/account");
    assert.equal(safeInternalPath("javascript:alert(1)"), "/account");
    assert.equal(safeInternalPath("/\\evil.example"), "/account");
    assert.equal(safeInternalPath(""), "/account");
    assert.equal(safeInternalPath(null), "/account");
  });

  test("parseRedirectSearch only returns safe values", () => {
    assert.equal(parseRedirectSearch({ redirect: "/checkout" }), "/checkout");
    assert.equal(parseRedirectSearch({ redirect: "https://evil.example" }), undefined);
    assert.equal(parseRedirectSearch({}), undefined);
  });
});
