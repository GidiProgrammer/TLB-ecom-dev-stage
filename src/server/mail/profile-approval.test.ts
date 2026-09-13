import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getCapturedEmails, resetCapturedEmails } from "./capture-driver.ts";
import {
  enqueueProfileApprovalFromTransition,
  notifyAfterCommerceCommit,
  PROFILE_APPROVED_TEMPLATE_ID,
  PROFILE_REJECTED_TEMPLATE_ID,
} from "./commerce.ts";
import { transactionalEventKey } from "./events.ts";
import { listMemoryOutbox, resetMemoryOutbox } from "./outbox.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");

const profile = {
  id: "99999999-9999-4999-8999-999999999999",
  email: "customer@example.test",
  fullName: "Ada Labs",
};

beforeEach(() => {
  process.env["MAIL_OUTBOX_BACKEND"] = "memory";
  process.env["MAIL_DRIVER"] = "capture";
  resetMemoryOutbox();
  resetCapturedEmails();
});

afterEach(() => {
  resetMemoryOutbox();
  resetCapturedEmails();
});

describe("profile approval transitions", () => {
  test("pending → approved creates exactly one profile.approval:{id}:approved", async () => {
    const first = await enqueueProfileApprovalFromTransition({
      ...profile,
      previousStatus: "pending",
      nextStatus: "approved",
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.created, true);
    assert.equal(first.row.eventKey, `profile.approval:${profile.id}:approved`);
    assert.equal(first.row.eventKey, transactionalEventKey("profile.approved", profile.id));
    assert.equal(first.row.templateId, PROFILE_APPROVED_TEMPLATE_ID);
    assert.equal(first.row.recipientEmail, "customer@example.test");
    assert.equal(first.row.payload["notice"], "account_approved");
    assert.equal(first.row.payload["fullName"], "Ada Labs");
    assert.equal("account_type" in first.row.payload, false);
    assert.equal("purchasing" in first.row.payload, false);
    assert.equal("cp22" in first.row.payload, false);
    assert.equal(listMemoryOutbox().length, 1);
  });

  test("pending → rejected creates exactly one profile.approval:{id}:rejected", async () => {
    const first = await enqueueProfileApprovalFromTransition({
      ...profile,
      id: "88888888-8888-4888-8888-888888888888",
      previousStatus: "pending",
      nextStatus: "rejected",
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.row.eventKey, "profile.approval:88888888-8888-4888-8888-888888888888:rejected");
    assert.equal(first.row.templateId, PROFILE_REJECTED_TEMPLATE_ID);
    assert.equal(first.row.payload["notice"], "account_rejected");
    assert.equal("reason" in first.row.payload, false);
    assert.equal("appeal" in first.row.payload, false);
    assert.equal("eligibility" in first.row.payload, false);
  });

  test("approved → approved does not enqueue", async () => {
    const result = await enqueueProfileApprovalFromTransition({
      ...profile,
      previousStatus: "approved",
      nextStatus: "approved",
    });
    assert.equal(result.ok, false);
    assert.equal(listMemoryOutbox().length, 0);
  });

  test("rejected → rejected does not enqueue", async () => {
    const result = await enqueueProfileApprovalFromTransition({
      ...profile,
      previousStatus: "rejected",
      nextStatus: "rejected",
    });
    assert.equal(result.ok, false);
    assert.equal(listMemoryOutbox().length, 0);
  });

  test("duplicate enqueue of the same approval event key does not create a second row", async () => {
    const input = { ...profile, previousStatus: "pending", nextStatus: "approved" as const };
    const first = await enqueueProfileApprovalFromTransition(input);
    const second = await enqueueProfileApprovalFromTransition(input);
    assert.equal(first.ok && first.created, true);
    assert.equal(second.ok && second.created, false);
    assert.equal(listMemoryOutbox().length, 1);
  });
});

describe("profile approval enqueue failure", () => {
  test("successful approval result is returned even if enqueue throws", async () => {
    const mutation = { fullName: "Ada Labs", institutionName: null, approvalStatus: "approved" };
    const returned = await notifyAfterCommerceCommit(mutation, async () => {
      throw new Error("outbox unavailable");
    });
    assert.deepEqual(returned, mutation);
    assert.equal(listMemoryOutbox().length, 0);
    assert.equal(getCapturedEmails().length, 0);
  });
});

describe("profile approval security contract", () => {
  test("approval remains admin-only; staff order updates do not require admin", () => {
    const adminOps = readFileSync(resolve(root, "src/lib/admin-ops.ts"), "utf8");
    const approval = adminOps.slice(adminOps.indexOf("export const updateProfileApproval"));
    assert.match(approval, /loadStaffAccess/);
    assert.match(approval, /if \(!access\.isAdmin\)/);
    assert.match(approval, /throw new Error\("Unauthorized"\)/);
    assert.match(approval, /enqueueProfileApprovalFromTransition/);
    assert.match(approval, /getUserById/);
    assert.doesNotMatch(approval, /account_type/);

    const order = adminOps.slice(
      adminOps.indexOf("export const updateOrderStatus"),
      adminOps.indexOf("export const updateQuoteStatus"),
    );
    assert.match(order, /loadStaffAccess/);
    assert.doesNotMatch(order, /isAdmin/);
  });

  test("profile approval migration still blocks JWT approval writes", () => {
    const sql = readFileSync(
      resolve(here, "../../../supabase/migrations/20260911153000_tlb_profile_approval_security.sql"),
      "utf8",
    );
    assert.match(sql, /approval_status can only be changed by an admin/);
    assert.match(sql, /account_type cannot be changed/);
    assert.match(sql, /auth\.role\(\) = 'service_role'/);
  });
});
