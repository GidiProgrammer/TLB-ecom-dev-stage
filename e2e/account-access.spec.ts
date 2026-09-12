import { expect, test } from "@playwright/test";

test("unauthenticated /account redirects to /auth", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
});
