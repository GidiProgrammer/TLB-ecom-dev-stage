import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { MailProviderError } from "./types.ts";
import { resendMailDriver } from "./resend-driver.ts";
import { resolveMailDriver, sendTransactionalEmail } from "./adapter.ts";
import { getCapturedEmails, resetCapturedEmails } from "./capture-driver.ts";

const sample = {
  to: "lab@example.test",
  replyTo: "customer@example.test",
  subject: "We received your order TLB-1",
  templateId: "order-created",
  data: { reference: "TLB-1" },
  idempotencyKey: "order.created:ord-1",
  html: "<p>Hello</p>",
  text: "Hello",
};

const originalFetch = globalThis.fetch;

function mockFetch(impl: typeof fetch) {
  globalThis.fetch = impl;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetCapturedEmails();
  delete process.env["MAIL_DRIVER"];
  delete process.env["MAIL_PROVIDER_API_KEY"];
  delete process.env["MAIL_FROM"];
  delete process.env["MAIL_REPLY_TO"];
  delete process.env["MAIL_PROVIDER_TIMEOUT_MS"];
});

describe("mail driver selection", () => {
  test("capture driver still records without delivering", async () => {
    process.env["MAIL_DRIVER"] = "capture";
    const sent = await sendTransactionalEmail(sample);
    assert.equal(resolveMailDriver().name, "capture");
    assert.equal(sent.delivered, false);
    assert.equal(getCapturedEmails().length, 1);
  });

  test("unknown driver fails closed", () => {
    process.env["MAIL_DRIVER"] = "sendgrid";
    assert.throws(
      () => resolveMailDriver(),
      (error: unknown) => error instanceof MailProviderError && error.retryable === false,
    );
  });
});

describe("resend driver", () => {
  test("success posts html, text, idempotency key, and reply-to", async () => {
    process.env["MAIL_PROVIDER_API_KEY"] = "test-key";
    process.env["MAIL_FROM"] = "TLB Enterprise <notices@example.test>";
    let requestUrl = "";
    let headers: Headers | undefined;
    let body: Record<string, unknown> = {};

    mockFetch(async (input, init) => {
      requestUrl = String(input);
      headers = new Headers(init?.headers);
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
    });

    const sent = await resendMailDriver.send(sample);
    assert.equal(sent.delivered, true);
    assert.equal(requestUrl, "https://api.resend.com/emails");
    assert.equal(headers?.get("Authorization"), "Bearer test-key");
    assert.equal(headers?.get("Idempotency-Key"), sample.idempotencyKey);
    assert.deepEqual(body["to"], [sample.to]);
    assert.equal(body["from"], "TLB Enterprise <notices@example.test>");
    assert.equal(body["html"], sample.html);
    assert.equal(body["text"], sample.text);
    assert.equal(body["reply_to"], sample.replyTo);
    assert.equal(body["subject"], sample.subject);
  });

  test("uses MAIL_REPLY_TO when input has no replyTo", async () => {
    process.env["MAIL_PROVIDER_API_KEY"] = "test-key";
    process.env["MAIL_FROM"] = "notices@example.test";
    process.env["MAIL_REPLY_TO"] = "staff@example.test";
    let body: Record<string, unknown> = {};
    mockFetch(async (_input, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response("{}", { status: 200 });
    });
    const { replyTo: _ignored, ...withoutReply } = sample;
    await resendMailDriver.send(withoutReply);
    assert.equal(body["reply_to"], "staff@example.test");
  });

  test("non-2xx 4xx is a permanent failure", async () => {
    process.env["MAIL_PROVIDER_API_KEY"] = "test-key";
    process.env["MAIL_FROM"] = "notices@example.test";
    mockFetch(async () => new Response("{}", { status: 422 }));
    await assert.rejects(
      () => resendMailDriver.send(sample),
      (error: unknown) =>
        error instanceof MailProviderError && error.retryable === false && error.statusCode === 422,
    );
  });

  test("429 is retryable", async () => {
    process.env["MAIL_PROVIDER_API_KEY"] = "test-key";
    process.env["MAIL_FROM"] = "notices@example.test";
    mockFetch(async () => new Response("{}", { status: 429 }));
    await assert.rejects(
      () => resendMailDriver.send(sample),
      (error: unknown) => error instanceof MailProviderError && error.retryable === true && error.statusCode === 429,
    );
  });

  test("5xx is retryable", async () => {
    process.env["MAIL_PROVIDER_API_KEY"] = "test-key";
    process.env["MAIL_FROM"] = "notices@example.test";
    mockFetch(async () => new Response("{}", { status: 503 }));
    await assert.rejects(
      () => resendMailDriver.send(sample),
      (error: unknown) => error instanceof MailProviderError && error.retryable === true && error.statusCode === 503,
    );
  });

  test("network failure is retryable", async () => {
    process.env["MAIL_PROVIDER_API_KEY"] = "test-key";
    process.env["MAIL_FROM"] = "notices@example.test";
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });
    await assert.rejects(
      () => resendMailDriver.send(sample),
      (error: unknown) =>
        error instanceof MailProviderError && error.retryable === true && error.message === "Resend network failure",
    );
  });

  test("timeout is retryable", async () => {
    process.env["MAIL_PROVIDER_API_KEY"] = "test-key";
    process.env["MAIL_FROM"] = "notices@example.test";
    process.env["MAIL_PROVIDER_TIMEOUT_MS"] = "20";
    mockFetch(async (_input, init) => {
      const signal = init?.signal;
      return await new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    await assert.rejects(
      () => resendMailDriver.send(sample),
      (error: unknown) =>
        error instanceof MailProviderError && error.retryable === true && error.message === "Resend request timed out",
    );
  });

  test("missing API key fails closed", async () => {
    process.env["MAIL_FROM"] = "notices@example.test";
    await assert.rejects(
      () => resendMailDriver.send(sample),
      (error: unknown) => error instanceof MailProviderError && error.retryable === false,
    );
  });

  test("missing MAIL_FROM fails closed", async () => {
    process.env["MAIL_PROVIDER_API_KEY"] = "test-key";
    await assert.rejects(
      () => resendMailDriver.send(sample),
      (error: unknown) =>
        error instanceof MailProviderError &&
        error.retryable === false &&
        error.message.includes("MAIL_FROM"),
    );
  });
});
