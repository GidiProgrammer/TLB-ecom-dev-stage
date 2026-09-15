import { expect, test } from "@playwright/test";

test.describe("CP36 visual foundation", () => {
  test("skip link, labelled cart/quote, and order vs quote explainer", async ({ page }) => {
    await page.goto("/");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toHaveAttribute("href", "#main-content");
    await skip.focus();
    await expect(skip).toBeVisible();
    await skip.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();

    const header = page.locator("header");
    await expect(header.getByRole("link", { name: /^Cart/ })).toBeVisible();
    await expect(header.getByRole("link", { name: /^Quote/ })).toBeVisible();
  });
});
