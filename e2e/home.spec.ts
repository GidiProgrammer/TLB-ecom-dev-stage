import { expect, test } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Laboratory supplies for serious work.",
  );
  await expect(page.getByRole("heading", { name: "New in catalogue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Best sellers" })).toHaveCount(0);
});
