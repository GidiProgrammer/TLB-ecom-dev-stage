import { expect, test } from "@playwright/test";

test.describe("durable commerce confirmations", () => {
  test("unsafe confirmation refs do not open-redirect and require sign-in", async ({ page }) => {
    await page.goto("/checkout/confirmed?ref=https://evil.example");
    await expect(page).toHaveURL(/\/auth/);
    await expect(page).not.toHaveURL(/evil/);
    await expect(page.locator('a[href*="evil"]')).toHaveCount(0);

    await page.goto("/quote/confirmed?ref=javascript:alert(1)");
    await expect(page).toHaveURL(/\/auth/);
    await expect(page).not.toHaveURL(/javascript/);
    await expect(page.locator('a[href*="javascript"]')).toHaveCount(0);
  });

  test("valid-looking confirmation URLs keep a safe return path for sign-in", async ({ page }) => {
    await page.goto("/checkout/confirmed?ref=TLB-20260915-AB12CD");
    await expect(page).toHaveURL(/\/auth\?redirect=/);
    await expect(page).toHaveURL(/checkout%2Fconfirmed/);
    await expect(page).toHaveURL(/TLB-20260915-AB12CD/);
    await expect(page).not.toHaveURL(/evil/);
  });
});
