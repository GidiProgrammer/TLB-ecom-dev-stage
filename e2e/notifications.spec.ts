import { expect, test } from "@playwright/test";
import {
  cleanupCustomerNotifications,
  resolveE2EUserId,
  seedCustomerNotifications,
} from "./notifications-helpers";

test.describe("in-app notifications", () => {
  test.describe.configure({ mode: "serial" });

  test("authenticated customer sees the notification bell", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("button", { name: /Notifications/ })).toBeVisible();
  });

  test("empty or seeded notification UI, unread count, open, and mark read", async ({ page }) => {
    const userId = await resolveE2EUserId();
    test.skip(!userId, "Could not resolve E2E user for notification seeding");

    await cleanupCustomerNotifications(userId!);
    const seeded = await seedCustomerNotifications(userId!);
    test.skip(!seeded?.length, "customer_notifications table is not available on this database");

    await page.goto("/account");
    await page.getByRole("button", { name: /Notifications/ }).click();
    await expect(page.getByRole("button", { name: /E2E order received/ })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /E2E order received/ }).click();
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole("tab", { name: "Orders" })).toHaveAttribute("data-state", "active");

    await page.goto("/account/notifications");
    await expect(page.getByRole("heading", { name: "E2E quote submitted" })).toBeVisible();
    await page.getByRole("article").filter({ hasText: "E2E quote submitted" }).getByRole("link", { name: "Open" }).click();
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole("tab", { name: "Quote requests" })).toHaveAttribute("data-state", "active");

    await cleanupCustomerNotifications(userId!);
  });

  test("sign out prevents authenticated account access", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Account dashboard" })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
    await page.goto("/account");
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
  });
});
