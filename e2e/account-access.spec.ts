import { expect, test } from "@playwright/test";

test("unauthenticated /account redirects to /auth", async ({ page }) => {
  await page.goto("/account?tab=quotes&ref=QT-20260922-ABCDEF");
  await expect(page).toHaveURL(/\/auth\?redirect=/, { timeout: 15_000 });
  const redirect = new URL(page.url()).searchParams.get("redirect");
  expect(redirect).toBe("/account?tab=quotes&ref=QT-20260922-ABCDEF");
  expect(redirect).not.toMatch(/evil|https?:/);
});
