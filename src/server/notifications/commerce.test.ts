import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createOrderCreatedNotification,
  createOrderLifecycleNotification,
  createProfileApprovalNotification,
  createQuoteLifecycleNotification,
  createQuoteSubmittedNotification,
  runAfterCommerceCommit,
} from "./commerce.ts";
import { customerNotificationEventKey } from "./events.ts";
import {
  listForUserInMemory,
  markAllNotificationsReadInMemory,
  markNotificationReadInMemory,
  notificationsBackendKind,
  resetMemoryNotifications,
  unreadCountForUserInMemory,
} from "./store.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");

beforeEach(() => {
  process.env["NOTIFICATIONS_BACKEND"] = "memory";
  resetMemoryNotifications();
});

afterEach(() => {
  resetMemoryNotifications();
});

const userA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const orderId = "11111111-1111-4111-8111-111111111111";

describe("customer notification creation", () => {
  test("order.created writes one notification for the recipient", async () => {
    const result = await createOrderCreatedNotification({
      id: orderId,
      userId: userA,
      reference: "TLB-20260915-ABC123",
    });
    assert.equal(result.ok, true);
    const rows = listForUserInMemory(userA);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.eventType, "order.created");
    assert.equal(rows[0]?.eventKey, customerNotificationEventKey("order.created", orderId));
    assert.equal(rows[0]?.userId, userA);
    assert.equal(unreadCountForUserInMemory(userA), 1);
  });

  test("quote.submitted uses a dedicated event type, not warehouse notifications", async () => {
    const quoteId = "22222222-2222-4222-8222-222222222222";
    await createQuoteSubmittedNotification({
      id: quoteId,
      userId: userA,
      reference: "QT-20260915-XYZ",
    });
    assert.equal(listForUserInMemory(userA)[0]?.eventType, "quote.submitted");
    assert.equal(
      listForUserInMemory(userA)[0]?.eventKey,
      customerNotificationEventKey("quote.submitted", quoteId),
    );
  });
});

describe("event-key idempotency", () => {
  test("replayed order.created does not create a second row", async () => {
    const input = { id: orderId, userId: userA, reference: "TLB-1" };
    const first = await createOrderCreatedNotification(input);
    const second = await createOrderCreatedNotification(input);
    assert.equal(first.ok && first.created, true);
    assert.equal(second.ok && second.created, false);
    assert.equal(listForUserInMemory(userA).length, 1);
  });

  test("shipped → shipped does not create a notification", async () => {
    const result = await createOrderLifecycleNotification({
      id: orderId,
      userId: userA,
      reference: "TLB-1",
      previousStatus: "shipped",
      nextStatus: "shipped",
    });
    assert.equal(result.ok, false);
    assert.equal(listForUserInMemory(userA).length, 0);
  });
});

describe("ownership and mark-read", () => {
  test("unread count is scoped to the recipient", async () => {
    await createOrderCreatedNotification({ id: orderId, userId: userA, reference: "TLB-A" });
    await createQuoteSubmittedNotification({
      id: "33333333-3333-4333-8333-333333333333",
      userId: userB,
      reference: "QT-B",
    });
    assert.equal(unreadCountForUserInMemory(userA), 1);
    assert.equal(unreadCountForUserInMemory(userB), 1);
    assert.equal(listForUserInMemory(userA).every((row) => row.userId === userA), true);
  });

  test("mark read only succeeds for the owner", async () => {
    await createOrderCreatedNotification({ id: orderId, userId: userA, reference: "TLB-A" });
    const row = listForUserInMemory(userA)[0]!;
    assert.equal(markNotificationReadInMemory(row.id, userB), 0);
    assert.equal(unreadCountForUserInMemory(userA), 1);
    assert.equal(markNotificationReadInMemory(row.id, userA), 1);
    assert.equal(unreadCountForUserInMemory(userA), 0);
    assert.equal(markNotificationReadInMemory(row.id, userA), 0);
  });

  test("mark all read only affects the owner", async () => {
    await createOrderCreatedNotification({ id: orderId, userId: userA, reference: "TLB-A" });
    await createOrderLifecycleNotification({
      id: orderId,
      userId: userA,
      reference: "TLB-A",
      previousStatus: "processing",
      nextStatus: "shipped",
    });
    await createQuoteSubmittedNotification({
      id: "44444444-4444-4444-8444-444444444444",
      userId: userB,
      reference: "QT-B",
    });
    assert.equal(markAllNotificationsReadInMemory(userA), 2);
    assert.equal(unreadCountForUserInMemory(userA), 0);
    assert.equal(unreadCountForUserInMemory(userB), 1);
  });

  test("profile approval notification is addressed to the profile user", async () => {
    const result = await createProfileApprovalNotification({
      id: userA,
      previousStatus: "pending",
      nextStatus: "approved",
    });
    assert.equal(result.ok, true);
    assert.equal(listForUserInMemory(userA)[0]?.userId, userA);
    assert.equal(listForUserInMemory(userB).length, 0);
  });
});

describe("notifications backend selection", () => {
  const envKeys = ["NOTIFICATIONS_BACKEND", "MAIL_OUTBOX_BACKEND", "SUPABASE_SERVICE_ROLE_KEY"] as const;

  function snapshotEnv() {
    return Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  }

  function restoreEnv(env: Record<string, string | undefined>) {
    for (const key of envKeys) {
      const value = env[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    process.env["NOTIFICATIONS_BACKEND"] = "memory";
  }

  test("NOTIFICATIONS_BACKEND=memory uses memory even when a service role key exists", () => {
    const previous = snapshotEnv();
    try {
      process.env["NOTIFICATIONS_BACKEND"] = "memory";
      process.env["SUPABASE_SERVICE_ROLE_KEY"] = "service-role-test";
      process.env["MAIL_OUTBOX_BACKEND"] = "supabase";
      assert.equal(notificationsBackendKind(), "memory");
    } finally {
      restoreEnv(previous);
    }
  });

  test("MAIL_OUTBOX_BACKEND=memory does not force in-app notifications onto memory", () => {
    const previous = snapshotEnv();
    try {
      delete process.env["NOTIFICATIONS_BACKEND"];
      process.env["MAIL_OUTBOX_BACKEND"] = "memory";
      process.env["SUPABASE_SERVICE_ROLE_KEY"] = "service-role-test";
      assert.equal(notificationsBackendKind(), "supabase");
    } finally {
      restoreEnv(previous);
    }
  });

  test("missing service role key uses memory", () => {
    const previous = snapshotEnv();
    try {
      delete process.env["NOTIFICATIONS_BACKEND"];
      delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
      process.env["MAIL_OUTBOX_BACKEND"] = "supabase";
      assert.equal(notificationsBackendKind(), "memory");
    } finally {
      restoreEnv(previous);
    }
  });
});

describe("post-commit isolation", () => {
  test("a failed notification write does not reject the commerce result", async () => {
    const commerce = { orderId: "ok" };
    await runAfterCommerceCommit([
      {
        channel: "customer-notifications",
        run: async () => {
          throw new Error("notification insert failed");
        },
      },
    ]);
    assert.equal(commerce.orderId, "ok");
  });

  test("email and notification failures are logged on separate channels", async () => {
    const lines: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };
    try {
      await runAfterCommerceCommit([
        {
          channel: "transactional-email",
          run: async () => {
            throw new Error("outbox unavailable");
          },
        },
        {
          channel: "customer-notifications",
          run: async () => {
            throw new Error("notification insert failed");
          },
        },
      ]);
    } finally {
      console.error = original;
    }
    assert.equal(lines.some((line) => line.includes("[transactional-email]") && line.includes("outbox unavailable")), true);
    assert.equal(
      lines.some((line) => line.includes("[customer-notifications]") && line.includes("notification insert failed")),
      true,
    );
    assert.equal(lines.some((line) => line.includes("[customer-notifications]") && line.includes("outbox unavailable")), false);
  });
});

describe("security source boundaries", () => {
  test("migration locks writes to service-role mark-read RPCs", () => {
    const sql = readFileSync(
      resolve(root, "supabase/migrations/20260916010000_tlb_customer_notifications.sql"),
      "utf8",
    );
    assert.match(sql, /CREATE TABLE public\.customer_notifications/);
    assert.match(sql, /GRANT SELECT ON TABLE public\.customer_notifications TO authenticated/);
    assert.match(sql, /customers select own notifications/);
    assert.match(sql, /user_id = auth\.uid\(\)/);
    assert.match(sql, /No INSERT\/UPDATE\/DELETE policies/);
    assert.match(sql, /mark_customer_notification_read/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.mark_customer_notification_read/);
    assert.match(sql, /REVOKE ALL ON FUNCTION public\.mark_customer_notification_read/);
    assert.match(sql, /FROM PUBLIC, anon, authenticated/);
    assert.doesNotMatch(sql, /CREATE TABLE public\.notifications/);
    assert.match(sql, /Does not reuse warehouse public\.notifications/);
  });

  test("hardening migration binds mark-read to auth.uid and tightens href CHECK", () => {
    const sql = readFileSync(
      resolve(root, "supabase/migrations/20260916120000_tlb_customer_notifications_hardening.sql"),
      "utf8",
    );
    assert.match(sql, /auth\.uid\(\) IS NOT NULL AND p_user_id IS DISTINCT FROM auth\.uid\(\)/);
    assert.match(sql, /REVOKE ALL ON FUNCTION public\.mark_customer_notification_read/);
    assert.match(sql, /FROM PUBLIC, anon, authenticated/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.mark_customer_notification_read/);
    assert.match(sql, /TO service_role/);
    assert.match(sql, /href !~ E'/);
    assert.match(sql, /\^\/\[a-zA-Z\]\[a-zA-Z0-9\+\.\-\]\*:/);
    assert.match(sql, /position\(E'\\\\' in href\) = 0/);
    assert.match(sql, /href NOT LIKE '\/\/\%'/);
    assert.doesNotMatch(sql, /DROP POLICY/);
    assert.doesNotMatch(sql, /GRANT INSERT/);
    assert.doesNotMatch(sql, /GRANT UPDATE/);
  });

  test("notification storage is not coupled to MAIL_OUTBOX_BACKEND", () => {
    const store = readFileSync(resolve(root, "src/server/notifications/store.ts"), "utf8");
    const kindFn = store.slice(store.indexOf("export function notificationsBackendKind"));
    assert.match(kindFn, /NOTIFICATIONS_BACKEND/);
    assert.equal(kindFn.includes("MAIL_OUTBOX_BACKEND"), false);
  });

  test("server functions require auth and do not expose supabaseAdmin to routes", () => {
    const lib = readFileSync(resolve(root, "src/lib/notifications.ts"), "utf8");
    assert.match(lib, /requireSupabaseAuth/);
    assert.match(lib, /createServerFn/);
    assert.match(lib, /markCustomerNotificationRead/);
    assert.match(lib, /context\.userId/);
    assert.doesNotMatch(lib, /from "@\/integrations\/supabase\/client\.server"/);

    const routesDir = resolve(root, "src/routes");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name);
        if (name.isDirectory()) walk(p);
        else if (name.name.endsWith(".tsx") || name.name.endsWith(".ts")) files.push(p);
      }
    };
    walk(routesDir);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      assert.equal(text.includes("@/server/"), false, file);
      assert.equal(text.includes("src/server/"), false, file);
    }
  });
});
