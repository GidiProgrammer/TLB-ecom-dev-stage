import { expect, test } from "@playwright/test";

test("unauthenticated /account redirects to /auth", async ({ page }) => {
  await page.goto("/account?tab=quotes&ref=QT-20260922-ABCDEF");
  await expect(page).toHaveURL(/\/auth\?redirect=/, { timeout: 15_000 });
  const redirect = new URL(page.url()).searchParams.get("redirect");
  expect(redirect).toBe("/account?tab=quotes&ref=QT-20260922-ABCDEF");
  expect(redirect).not.toMatch(/evil|https?:/);
});

test("unauthenticated admin order and quote pages redirect to sign in", async ({ page }) => {
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/auth\?redirect=/, { timeout: 15_000 });
  expect(new URL(page.url()).searchParams.get("redirect")).toBe("/admin/orders");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.goto("/admin/quotes");
  await expect(page).toHaveURL(/\/auth\?redirect=/, { timeout: 15_000 });
  expect(new URL(page.url()).searchParams.get("redirect")).toBe("/admin/quotes");
  await expect(page.getByRole("button", { name: /Open quote / })).toHaveCount(0);
});
