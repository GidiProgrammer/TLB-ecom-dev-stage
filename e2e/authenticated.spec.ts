import { expect, test } from "@playwright/test";
import { e2eCredentials } from "./load-env";

test("authenticated customer can open account", async ({ page }) => {
  const creds = e2eCredentials();
  if (!creds) {
    throw new Error("E2E_USER_EMAIL and E2E_USER_PASSWORD must be set in the local environment");
  }

  await page.goto("/account");
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByRole("heading", { name: "Account dashboard" })).toBeVisible();
  await expect(page.getByText(creds.email, { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Admin overview" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /admin/i })).toHaveCount(0);

  await expect(page.getByRole("tab", { name: "Orders" })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Orders" }).getByText(/^TLB-/)).toBeVisible();

  await page.getByRole("tab", { name: "Quote requests" }).click();
  await expect(page.getByRole("tabpanel", { name: "Quote requests" }).getByText(/^QT-/)).toBeVisible();

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByRole("heading", { name: "Admin overview" })).toHaveCount(0);
});
