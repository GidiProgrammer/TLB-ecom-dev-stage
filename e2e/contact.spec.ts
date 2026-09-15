import { expect, test, type Page } from "@playwright/test";

async function waitHydrated(page: Page, selector: string) {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const key = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
    return Boolean(key);
  }, selector);
}

test.describe("contact form", () => {
  test("valid submission is accepted without implying delivery", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: "Contact us" })).toBeVisible();
    await waitHydrated(page, "#c-name");

    await page.locator("#c-name").fill("Ama Mensah");
    await page.locator("#c-email").fill("ama@example.test");
    await page.locator("#c-phone").fill("024 000 0000");
    await page.locator("#c-org").fill("Lab One");
    await page.locator("#c-msg").fill("Need reagent stock for the Accra lab.");
    const serverFn = page.waitForResponse((response) => {
      return response.request().method() === "POST" && response.url().includes("/_serverFn/");
    });
    await page.getByRole("button", { name: "Send message" }).click();
    const response = await serverFn;
    expect(response.ok()).toBeTruthy();

    // Local vite may lack CONTACT_RECIPIENT_EMAIL; the production bug was a
    // validation error on a valid payload. That copy must not appear here.
    await expect(page.getByText("Please check the form and try again.")).toHaveCount(0);
    await expect(page.getByRole("status").or(page.getByRole("alert"))).toBeVisible();
    await expect(page.getByRole("status").or(page.getByRole("alert"))).not.toContainText(
      "Please check the form and try again.",
    );
  });

  test("invalid email stays on the form with a validation error", async ({ page }) => {
    await page.goto("/contact");
    await waitHydrated(page, "#c-name");
    await page.locator("#c-name").fill("Ama Mensah");
    await page.locator("#c-email").fill("not-an-email");
    await page.locator("#c-msg").fill("Need reagent stock.");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByRole("alert")).toContainText("Please check the form and try again.");
    await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();
  });
});
