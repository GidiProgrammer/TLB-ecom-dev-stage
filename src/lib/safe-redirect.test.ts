import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { customerReturnPath, parseRedirectSearch, safeInternalPath } from "./safe-redirect.ts";

const here = dirname(fileURLToPath(import.meta.url));

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
    assert.equal(safeInternalPath("/javascript:alert(1)"), "/account");
    assert.equal(safeInternalPath("/\\evil.example"), "/account");
    assert.equal(safeInternalPath(""), "/account");
    assert.equal(safeInternalPath(null), "/account");
  });

  test("parseRedirectSearch only returns safe values", () => {
    assert.equal(parseRedirectSearch({ redirect: "/checkout" }), "/checkout");
    assert.equal(parseRedirectSearch({ redirect: "https://evil.example" }), undefined);
    assert.equal(parseRedirectSearch({}), undefined);
  });

  test("customer return paths keep account search and reject external targets", () => {
    assert.equal(
      customerReturnPath("/account", "?tab=quotes&ref=QT-20260922-ABCDEF"),
      "/account?tab=quotes&ref=QT-20260922-ABCDEF",
    );
    assert.equal(
      customerReturnPath("/account", "?tab=orders&ref=TLB-20260922-ABCDEF"),
      "/account?tab=orders&ref=TLB-20260922-ABCDEF",
    );
    assert.equal(customerReturnPath("/account/notifications"), "/account/notifications");
    assert.equal(customerReturnPath("/experiments"), "/experiments");
    assert.equal(customerReturnPath("https://evil.example"), "/account");
    assert.equal(customerReturnPath("//evil.example"), "/account");
    assert.equal(customerReturnPath("/account", "?redirect=https://evil.example"), "/account");
  });

  test("authenticated routes send a safe return path", () => {
    const route = readFileSync(resolve(here, "../routes/_authenticated/route.tsx"), "utf8");
    assert.match(route, /customerReturnPath/);
    assert.match(route, /redirect:\s*customerReturnPath/);
  });
});
