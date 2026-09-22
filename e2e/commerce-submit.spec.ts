import { expect, test, type Page } from "@playwright/test";

async function seedCart(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "tlb-store-v1",
      JSON.stringify({ cart: [{ id: "ac-002", qty: 1 }], quote: [{ id: "ac-002", qty: 1 }] }),
    );
  });
}

test.describe("commerce submit idempotency", () => {
  test.describe.configure({ mode: "serial" });

  test("checkout double-submit keeps a single nonce and confirms once", async ({ page }) => {
    test.setTimeout(120_000);
    await seedCart(page);
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("Contact name").fill("E2E Checkout");
    await page.getByLabel("Email").fill("e2e-checkout@example.test");
    await page.getByLabel("Phone").fill("+233000000000");
    await page.getByLabel("Delivery address").fill("1 Test Road");
    await page.getByLabel("City / town").fill("Accra");

    const submit = page.getByRole("button", { name: "Place order" });
    await expect(submit).toBeEnabled({ timeout: 15_000 });
    await submit.click();
    await submit.click({ force: true, timeout: 1_000 }).catch(() => undefined);

    const confirmed = page.locator("h1").filter({ hasText: "Order received" });
    const failed = page.getByRole("alert").filter({ hasText: "Your order was not placed" });
    await Promise.race([
      confirmed.waitFor({ state: "attached", timeout: 90_000 }),
      failed.waitFor({ state: "attached", timeout: 90_000 }),
    ]);

    if (await confirmed.count()) {
      await expect(page).toHaveURL(/\/checkout\/confirmed\?ref=TLB-/);
      await expect(page.getByText(/Keep this reference/i)).toBeVisible();
      await expect(page.getByText(/No payment was taken/i)).toBeVisible();
      const nonce = await page.evaluate(() => window.localStorage.getItem("tlb-order-submission-nonce"));
      expect(nonce).toBeNull();
      const confirmationUrl = page.url();
      await page.reload();
      await expect(page).toHaveURL(confirmationUrl);
      await expect(page.getByRole("heading", { name: "Order received" })).toBeVisible();
      await expect(page.getByText(/Keep this reference/i)).toBeVisible();
      await page.goto("/cart");
      await expect(page.getByText("Your cart is empty")).toBeVisible();
    }
  });

  test("quote duplicate-submit shows one confirmation", async ({ page }) => {
    test.setTimeout(120_000);
    await seedCart(page);
    await page.goto("/quote");
    await expect(page.getByRole("heading", { name: "Request a quote" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /Methanol/i })).toBeVisible({ timeout: 15_000 });

    const name = page.getByLabel("Contact name");
    const email = page.getByLabel("Email");
    const phone = page.getByLabel("Phone");
    await expect(async () => {
      await name.fill("E2E Quote");
      await email.fill("e2e-quote@example.test");
      await phone.fill("+233000000000");
      await expect(name).toHaveValue("E2E Quote");
      await expect(email).toHaveValue("e2e-quote@example.test");
    }).toPass();

    const submit = page.getByRole("button", { name: "Submit quote request" });
    await expect(submit).toBeEnabled({ timeout: 15_000 });
    await submit.click();
    await submit.click({ force: true, timeout: 1_000 }).catch(() => undefined);

    const confirmed = page.locator("h1").filter({ hasText: "Quote request received" });
    const failed = page.getByRole("alert").filter({ hasText: "Your quote request was not submitted" });
    await Promise.race([
      confirmed.waitFor({ state: "attached", timeout: 90_000 }),
      failed.waitFor({ state: "attached", timeout: 90_000 }),
    ]);

    if (await confirmed.count()) {
      await expect(page).toHaveURL(/\/quote\/confirmed\?ref=QT-/);
      await expect(page.getByText(/Keep this reference/i)).toBeVisible();
      const nonce = await page.evaluate(() => window.localStorage.getItem("tlb-quote-submission-nonce"));
      expect(nonce).toBeNull();
      const confirmationUrl = page.url();
      await page.reload();
      await expect(page).toHaveURL(confirmationUrl);
      await expect(page.getByRole("heading", { name: "Quote request received" })).toBeVisible();
      await expect(page.getByText(/Keep this reference/i)).toBeVisible();
    }
  });
});
