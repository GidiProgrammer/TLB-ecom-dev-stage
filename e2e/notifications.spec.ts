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
    await page.goto("/account");
    await page.getByRole("button", { name: /Notifications/ }).click();
    await expect(page.getByText("No notifications yet.")).toBeVisible();
    await page.getByRole("link", { name: "View all notifications" }).click();
    await expect(page).toHaveURL(/\/account\/notifications/);
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await expect(page.getByText("No notifications yet.")).toBeVisible();

    const seeded = await seedCustomerNotifications(userId!);
    test.skip(!seeded?.length, "customer_notifications table is not available on this database");

    await page.goto("/account");
    const bell = page.getByRole("button", { name: /Notifications, 2 unread/ });
    await expect(bell).toBeVisible();
    await bell.click();
    await expect(page.getByRole("button", { name: /E2E order received/ })).toBeVisible();
    await page.getByRole("button", { name: /E2E order received/ }).click();
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole("tab", { name: "Orders" })).toHaveAttribute("data-state", "active");

    await page.goto("/account/notifications");
    await expect(page.getByRole("heading", { name: "E2E quote submitted" })).toBeVisible();
    await page.getByRole("button", { name: "Mark as read" }).first().click();
    await expect(page.getByRole("button", { name: "Mark as read" })).toHaveCount(1);

    await page.getByRole("button", { name: "Mark all as read" }).click();
    await expect(page.getByRole("button", { name: "Mark as read" })).toHaveCount(0);
    await page.getByRole("link", { name: "Open" }).first().click();
    await expect(page).toHaveURL(/\/account/);

    await cleanupCustomerNotifications(userId!);
  });
});
