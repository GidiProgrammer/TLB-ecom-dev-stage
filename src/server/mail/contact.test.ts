import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { getCapturedEmails, resetCapturedEmails } from "./capture-driver.ts";
import {
  CONTACT_RATE_LIMIT_MAX,
  CONTACT_SUBMITTED_TEMPLATE_ID,
  ContactConfigError,
  ContactRateLimitError,
  ContactValidationError,
  mapContactError,
  parseContactInput,
  resetContactRateLimit,
  runSubmitContactServerFn,
  staffContactRecipient,
  submitContactEnquiry,
} from "./contact.ts";
import { transactionalEventKey } from "./events.ts";
import { listMemoryOutbox, resetMemoryOutbox } from "./outbox.ts";
import { processTransactionalEmailOutbox } from "./processor.ts";
import { subjectForTransactionalEmail } from "./policy.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");

const valid = {
  name: "  Ama Mensah  ",
  email: "  ama@example.test  ",
  phone: " 024 000 0000 ",
  institution: "  Lab One  ",
  message: "  Need reagent stock  ",
};

beforeEach(() => {
  process.env["MAIL_OUTBOX_BACKEND"] = "memory";
  process.env["MAIL_DRIVER"] = "capture";
  process.env["CONTACT_RECIPIENT_EMAIL"] = "staff@example.test";
  resetMemoryOutbox();
  resetCapturedEmails();
  resetContactRateLimit();
});

afterEach(() => {
  resetMemoryOutbox();
  resetCapturedEmails();
  resetContactRateLimit();
});

describe("contact validation", () => {
  test("valid contact submission is accepted and trimmed", () => {
    const parsed = parseContactInput(valid);
    assert.equal(parsed.name, "Ama Mensah");
    assert.equal(parsed.email, "ama@example.test");
    assert.equal(parsed.phone, "024 000 0000");
    assert.equal(parsed.institution, "Lab One");
    assert.equal(parsed.message, "Need reagent stock");
  });

  test("server-fn { data: form } envelope is unwrapped", () => {
    const parsed = parseContactInput({ data: valid });
    assert.equal(parsed.name, "Ama Mensah");
    assert.equal(parsed.email, "ama@example.test");
  });

  test("invalid email is rejected", () => {
    assert.throws(() => parseContactInput({ ...valid, email: "not-an-email" }), ContactValidationError);
  });

  test("empty required fields are rejected", () => {
    assert.throws(() => parseContactInput({ ...valid, name: "   " }), ContactValidationError);
    assert.throws(() => parseContactInput({ ...valid, email: "" }), ContactValidationError);
    assert.throws(() => parseContactInput({ ...valid, message: "\n\n" }), ContactValidationError);
  });

  test("overlong input is rejected", () => {
    assert.throws(() => parseContactInput({ ...valid, name: "a".repeat(201) }), ContactValidationError);
    assert.throws(() => parseContactInput({ ...valid, message: "m".repeat(2001) }), ContactValidationError);
  });

  test("header-breaking characters are rejected", () => {
    assert.throws(() => parseContactInput({ ...valid, email: "ama@example.test\nbcc:evil@x.test" }), ContactValidationError);
    assert.throws(() => parseContactInput({ ...valid, name: "Ama\r\nX-Inject: 1" }), ContactValidationError);
  });
});

describe("contact outbox", () => {
  test("successful submission creates exactly one contact.submitted event", async () => {
    await submitContactEnquiry(valid);
    const rows = listMemoryOutbox();
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.eventType, "contact.submitted");
    assert.equal(rows[0]?.templateId, CONTACT_SUBMITTED_TEMPLATE_ID);
  });

  test("event key is unique and server-generated", async () => {
    const first = await submitContactEnquiry(valid);
    resetContactRateLimit();
    const second = await submitContactEnquiry(valid);
    assert.notEqual(first.enquiryId, second.enquiryId);
    assert.equal(first.enquiryId.includes("@"), false);
    assert.match(first.enquiryId, /^[0-9a-f-]{36}$/i);
    assert.equal(listMemoryOutbox()[0]?.eventKey, transactionalEventKey("contact.submitted", first.enquiryId));
    assert.equal(listMemoryOutbox()[1]?.eventKey, `contact.submitted:${second.enquiryId}`);
  });

  test("staff recipient comes from server configuration", async () => {
    await submitContactEnquiry({ ...valid, recipientEmail: "attacker@evil.test", to: "attacker@evil.test" });
    assert.equal(listMemoryOutbox()[0]?.recipientEmail, "staff@example.test");
    assert.equal(staffContactRecipient(), "staff@example.test");
  });

  test("customer email is stored as reply-to/contact data", async () => {
    await submitContactEnquiry(valid);
    const row = listMemoryOutbox()[0];
    assert.equal(row?.payload["email"], "ama@example.test");
    assert.equal(row?.payload["replyTo"], "ama@example.test");
    assert.notEqual(row?.recipientEmail, "ama@example.test");
  });

  test("payload contains expected contact fields", async () => {
    await submitContactEnquiry(valid);
    const payload = listMemoryOutbox()[0]?.payload ?? {};
    assert.equal(payload["name"], "Ama Mensah");
    assert.equal(payload["email"], "ama@example.test");
    assert.equal(payload["phone"], "024 000 0000");
    assert.equal(payload["institution"], "Lab One");
    assert.equal(payload["message"], "Need reagent stock");
    assert.equal(typeof payload["enquiryId"], "string");
  });

  test("processor records reply-to without using the customer as destination", async () => {
    await submitContactEnquiry(valid);
    await processTransactionalEmailOutbox({ now: new Date() });
    const captured = getCapturedEmails()[0];
    assert.equal(captured?.to, "staff@example.test");
    assert.equal(captured?.replyTo, "ama@example.test");
    assert.equal(captured?.templateId, CONTACT_SUBMITTED_TEMPLATE_ID);
    assert.equal(captured?.subject, subjectForTransactionalEmail("contact-submitted", {}));
    assert.equal(captured?.delivered, false);
  });
});

describe("contact security", () => {
  test("client cannot choose destination recipient", async () => {
    process.env["CONTACT_RECIPIENT_EMAIL"] = "configured-staff@example.test";
    await submitContactEnquiry({
      ...valid,
      recipientEmail: "chosen@evil.test",
      CONTACT_RECIPIENT_EMAIL: "chosen@evil.test",
    });
    assert.equal(listMemoryOutbox()[0]?.recipientEmail, "configured-staff@example.test");
  });

  test("missing staff recipient is a configuration error", () => {
    delete process.env["CONTACT_RECIPIENT_EMAIL"];
    assert.throws(() => staffContactRecipient(), ContactConfigError);
  });

  test("client sources cannot write the outbox or embed mail secrets", () => {
    const contactRoute = readFileSync(resolve(root, "src/routes/contact.tsx"), "utf8");
    assert.match(contactRoute, /submitContact/);
    assert.equal(contactRoute.includes("@/server/"), false);
    assert.equal(contactRoute.includes("transactional_email_outbox"), false);
    assert.equal(contactRoute.includes("enqueueTransactionalEmail"), false);
    assert.equal(contactRoute.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
    assert.equal(contactRoute.includes("CONTACT_RECIPIENT_EMAIL"), false);
    assert.equal(contactRoute.includes("MAIL_DRIVER"), false);

    const libContact = readFileSync(resolve(root, "src/lib/contact.ts"), "utf8");
    assert.match(libContact, /createServerFn/);
    assert.match(libContact, /import\("@\/server\/mail\/contact"\)/);
    assert.match(libContact, /runSubmitContactServerFn/);

    const walk = (dir: string) => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name);
        if (name.isDirectory()) walk(p);
        else if (name.name.endsWith(".tsx") || name.name.endsWith(".ts")) {
          const text = readFileSync(p, "utf8");
          assert.equal(text.includes("transactional_email_outbox"), false, p);
          assert.equal(text.includes("CONTACT_RECIPIENT_EMAIL"), false, p);
        }
      }
    };
    walk(resolve(root, "src/routes"));
  });

  test("user input cannot become arbitrary mail headers", async () => {
    await submitContactEnquiry(valid);
    await processTransactionalEmailOutbox({ now: new Date() });
    const captured = getCapturedEmails()[0];
    assert.equal(captured?.subject, "Website enquiry");
    assert.equal(captured?.to, "staff@example.test");
    assert.equal(String(captured?.subject).includes("\n"), false);
  });
});

describe("contact rate limiting", () => {
  test("requests under the limit succeed", async () => {
    for (let i = 0; i < CONTACT_RATE_LIMIT_MAX; i += 1) {
      const result = await submitContactEnquiry({ ...valid, email: "limit@example.test" });
      assert.equal(result.accepted, true);
    }
    assert.equal(listMemoryOutbox().length, CONTACT_RATE_LIMIT_MAX);
  });

  test("requests above the limit are rejected", async () => {
    for (let i = 0; i < CONTACT_RATE_LIMIT_MAX; i += 1) {
      await submitContactEnquiry({ ...valid, email: "limit@example.test" });
    }
    await assert.rejects(
      () => submitContactEnquiry({ ...valid, email: "limit@example.test" }),
      ContactRateLimitError,
    );
    assert.equal(listMemoryOutbox().length, CONTACT_RATE_LIMIT_MAX);
  });

  test("rate-limit state cannot be disabled by browser input", async () => {
    for (let i = 0; i < CONTACT_RATE_LIMIT_MAX; i += 1) {
      await submitContactEnquiry({
        ...valid,
        email: "bypass@example.test",
        disableRateLimit: true,
        skipRateLimit: true,
      });
    }
    await assert.rejects(
      () =>
        submitContactEnquiry({
          ...valid,
          email: "bypass@example.test",
          disableRateLimit: true,
        }),
      ContactRateLimitError,
    );
  });
});

describe("contact failure semantics", () => {
  test("enqueue failure does not produce a false success response", async () => {
    await assert.rejects(
      () =>
        submitContactEnquiry(valid, {
          enqueue: async () => {
            throw new Error("relation transactional_email_outbox does not exist");
          },
        }),
      /Could not submit your message/,
    );
    assert.equal(listMemoryOutbox().length, 0);
  });

  test("internal errors are not leaked to the browser mapper", async () => {
    assert.equal(
      mapContactError(new Error("password authentication failed for user postgres")),
      "Could not submit your message. Please try again or call us.",
    );
  });

  test("honeypot submissions are rejected without enqueue", async () => {
    await assert.rejects(
      () => submitContactEnquiry({ ...valid, website: "https://spam.test" }),
      ContactValidationError,
    );
    assert.equal(listMemoryOutbox().length, 0);
  });

  test("missing CONTACT_RECIPIENT_EMAIL rejects before enqueue", async () => {
    delete process.env["CONTACT_RECIPIENT_EMAIL"];
    await assert.rejects(() => submitContactEnquiry(valid), ContactConfigError);
    assert.equal(listMemoryOutbox().length, 0);
  });

  test("TanStack server-fn envelope { data: form } is accepted", async () => {
    const result = await runSubmitContactServerFn({ data: valid });
    assert.equal(result.accepted, true);
    assert.equal(listMemoryOutbox().length, 1);
    assert.equal(listMemoryOutbox()[0]?.eventType, "contact.submitted");
  });

  test("double-wrapped { data: { data: form } } is accepted", async () => {
    const result = await runSubmitContactServerFn({ data: { data: valid } });
    assert.equal(result.accepted, true);
    assert.equal(listMemoryOutbox().length, 1);
  });

  test("invalid contact submission is mapped at the server-fn boundary", async () => {
    await assert.rejects(
      () => runSubmitContactServerFn({ data: { ...valid, email: "not-an-email" } }),
      (error: unknown) => error instanceof Error && error.message === "Please check the form and try again.",
    );
    assert.equal(listMemoryOutbox().length, 0);
  });

  test("enqueue failure is mapped at the server-fn boundary without leaking the cause", async () => {
    await assert.rejects(
      () =>
        runSubmitContactServerFn(valid, {
          enqueue: async () => {
            throw new Error("password authentication failed for user postgres");
          },
        }),
      (error: unknown) =>
        error instanceof Error && error.message === "Could not submit your message. Please try again or call us.",
    );
  });

  test("successful enqueue returns accepted", async () => {
    const result = await runSubmitContactServerFn(valid);
    assert.equal(result.accepted, true);
    assert.match(result.enquiryId, /^[0-9a-f-]{36}$/i);
    assert.equal(listMemoryOutbox().length, 1);
  });
});
