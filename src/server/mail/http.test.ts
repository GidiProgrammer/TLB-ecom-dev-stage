import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleTransactionalEmailCron } from "./http.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");

afterEach(() => {
  delete process.env["CRON_SECRET"];
});

describe("transactional email cron endpoint", () => {
  test("no secret configured returns 500 and does not process", async () => {
    let processed = false;
    const response = await handleTransactionalEmailCron(new Request("https://example.test/api/cron/transactional-email"), {
      process: async () => {
        processed = true;
        return { claimed: 1, sent: 1, retryScheduled: 0, permanentlyFailed: 0 };
      },
    });
    assert.equal(response.status, 500);
    assert.equal(processed, false);
  });

  test("missing Authorization returns 401", async () => {
    process.env["CRON_SECRET"] = "super-secret-value";
    const response = await handleTransactionalEmailCron(new Request("https://example.test/api/cron/transactional-email"));
    assert.equal(response.status, 401);
  });

  test("invalid token returns 401", async () => {
    process.env["CRON_SECRET"] = "super-secret-value";
    const response = await handleTransactionalEmailCron(
      new Request("https://example.test/api/cron/transactional-email", {
        headers: { Authorization: "Bearer wrong-token" },
      }),
    );
    assert.equal(response.status, 401);
  });

  test("valid token executes processor and returns counts only", async () => {
    process.env["CRON_SECRET"] = "super-secret-value";
    const response = await handleTransactionalEmailCron(
      new Request("https://example.test/api/cron/transactional-email?limit=99", {
        headers: { Authorization: "Bearer super-secret-value" },
      }),
      {
        process: async () => ({ claimed: 2, sent: 1, retryScheduled: 1, permanentlyFailed: 0 }),
      },
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as Record<string, unknown>;
    assert.deepEqual(body, {
      claimed: 2,
      sent: 1,
      retryScheduled: 1,
      permanentlyFailed: 0,
    });
    assert.equal("email" in body, false);
    assert.equal("to" in body, false);
    assert.equal("html" in body, false);
    assert.equal("payload" in body, false);
  });

  test("handler source ignores query batch size and does not return customer fields", () => {
    const http = readFileSync(resolve(here, "http.ts"), "utf8");
    assert.match(http, /const PROCESSOR_BATCH_SIZE = 10/);
    assert.doesNotMatch(http, /searchParams/);
    assert.doesNotMatch(http, /recipientEmail/);
    assert.match(http, /claimed: result.claimed/);

    const route = readFileSync(resolve(root, "src/routes/api/cron/transactional-email.ts"), "utf8");
    assert.doesNotMatch(route, /createServerFn/);
    assert.match(route, /runTransactionalEmailCron/);

    const lib = readFileSync(resolve(root, "src/lib/cron-transactional-email.ts"), "utf8");
    assert.match(lib, /await import\("@\/server\/mail\/http"\)/);
  });
});
