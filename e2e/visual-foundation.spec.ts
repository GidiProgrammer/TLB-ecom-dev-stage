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
    await expect(
      page.getByText("Order — buy from listed catalogue pricing.", { exact: false }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Quote — request pricing for items or quantities that need a quotation.", {
        exact: false,
      }).first(),
    ).toBeVisible();
  });
});
