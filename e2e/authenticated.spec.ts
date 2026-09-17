import { expect, test } from "@playwright/test";
import { e2eCredentials } from "./load-env";

test.describe("authenticated account", () => {
  test.describe.configure({ mode: "serial" });

  test("customer sees dashboard, profile editor, history, and no admin UI", async ({ page }) => {
    const creds = e2eCredentials();
    if (!creds) {
      throw new Error("E2E_USER_EMAIL and E2E_USER_PASSWORD must be set in the local environment");
    }

    await page.goto("/account");
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole("heading", { name: "Account dashboard" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Account dashboard" }).locator("xpath=..").getByText(creds.email, { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Admin overview" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /admin/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "My experiments" })).toBeVisible();
    await page.getByRole("link", { name: "My experiments" }).click();
    await expect(page).toHaveURL(/\/experiments/);
    await page.goto("/account");
    const name = page.getByLabel("Full name");
    await expect(name).toBeVisible();
    await expect(name).not.toHaveValue("");
    await expect(page.getByText(/Individual — |Institutional — /)).toBeVisible();
    await expect(page.getByText(/^pending$/i)).toHaveCount(0);

    const ordersPanel = page.getByRole("tabpanel", { name: "Orders" });
    await expect(page.getByRole("tab", { name: "Orders" })).toBeVisible();
    await expect(
      ordersPanel.getByText(/^TLB-/).or(ordersPanel.getByText("No orders yet")).first(),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Quote requests" }).click();
    const quotesPanel = page.getByRole("tabpanel", { name: "Quote requests" });
    await expect(
      quotesPanel.getByText(/^QT-/).or(quotesPanel.getByText("No quote requests yet")).first(),
    ).toBeVisible();
    await expect(quotesPanel.getByRole("button", { name: "Accept quotation" })).toHaveCount(
      await quotesPanel.getByText("Price provided").count(),
    );

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole("heading", { name: "Admin overview" })).toHaveCount(0);
  });

  test("customer can accept a quoted quotation without creating an order", async ({ page }) => {
    await page.goto("/account");
    await page.getByRole("tab", { name: "Quote requests" }).click();
    const quotesPanel = page.getByRole("tabpanel", { name: "Quote requests" });
    await expect(quotesPanel.getByText(/^QT-/).first()).toBeVisible();
    const accept = quotesPanel.getByRole("button", { name: "Accept quotation" });
    if ((await accept.count()) === 0) {
      test.skip(true, "No quoted quote is available for this fixture");
    }

    await expect(quotesPanel.getByText(/does not create an order or process payment/i).first()).toBeVisible();
    const card = quotesPanel.locator("article").filter({ hasText: "Accept quotation" }).first();
    const reference = (await card.locator("h3").innerText()).trim();
    await card.getByRole("button", { name: "Accept quotation" }).click();
    await expect(page.getByText(`Quotation ${reference} accepted`)).toBeVisible();
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole("heading", { name: "Checkout" })).toHaveCount(0);
    const updated = quotesPanel.locator("article").filter({ hasText: reference });
    await expect(updated.getByText("Accepted", { exact: true })).toBeVisible();
    await expect(updated.getByText(/does not create an order/i)).toBeVisible();
    await expect(updated.getByRole("link", { name: "Contact TLB" })).toBeVisible();
    await expect(updated.getByRole("button", { name: "Accept quotation" })).toHaveCount(0);
  });

  test("customer can save allowed profile fields and they persist after reload", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Profile details" })).toBeVisible({ timeout: 15_000 });

    const name = page.getByLabel("Full name");
    const phone = page.getByLabel("Phone");
    const instName = page.getByLabel("Institution name");
    const instType = page.getByLabel("Institution type");

    const original = {
      fullName: await name.inputValue(),
      phone: await phone.inputValue(),
      institutionName: await instName.inputValue(),
      institutionType: await instType.inputValue(),
    };

    const marker = `E2E ${Date.now().toString().slice(-6)}`;
    try {
      await name.fill(`${original.fullName} ${marker}`.slice(0, 120));
      await phone.fill(original.phone || "+233000000000");
      await page.getByRole("button", { name: "Save profile" }).click();
      await expect(page.getByText("Profile saved")).toBeVisible();

      await page.reload();
      await expect(page.getByRole("heading", { name: "Profile details" })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByLabel("Full name")).toHaveValue(new RegExp(marker));
    } finally {
      await page.goto("/account");
      await expect(page.getByRole("heading", { name: "Profile details" })).toBeVisible({ timeout: 15_000 });
      await page.getByLabel("Full name").fill(original.fullName || "E2E Customer");
      await page.getByLabel("Phone").fill(original.phone);
      await page.getByLabel("Institution name").fill(original.institutionName);
      await page.getByLabel("Institution type").fill(original.institutionType);
      await page.getByRole("button", { name: "Save profile" }).click();
      await expect(page.getByText("Profile saved")).toBeVisible();
    }
  });

  test("unknown owned confirmation refs show a safe missing state", async ({ page }) => {
    await page.goto("/checkout/confirmed?ref=TLB-19990101-000000");
    await expect(page.getByRole("heading", { name: "Order confirmation not found" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: "Go to your account" })).toBeVisible();
    await expect(page).toHaveURL(/\/checkout\/confirmed/);

    await page.goto("/quote/confirmed?ref=QT-19990101-000000");
    await expect(page.getByRole("heading", { name: "Quote confirmation not found" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: "Go to your account" })).toBeVisible();
  });

  test("account deep links expand owned history and unknown refs stay generic", async ({ page }) => {
    await page.goto("/account");
    const ordersPanel = page.getByRole("tabpanel", { name: "Orders" });
    await expect(
      ordersPanel.getByText(/^TLB-/).or(ordersPanel.getByText("No orders yet")).first(),
    ).toBeVisible();

    const orderHeading = ordersPanel.locator("article h3").first();
    if ((await orderHeading.count()) > 0) {
      const orderRef = (await orderHeading.innerText()).trim();
      await page.goto(`/account?tab=orders&ref=${encodeURIComponent(orderRef)}`);
      await expect(page.getByRole("tab", { name: "Orders" })).toHaveAttribute("data-state", "active");
      const orderCard = ordersPanel.locator("article").filter({ hasText: orderRef }).first();
      await expect(orderCard).toHaveAttribute("aria-current", "true");
      await expect(orderCard.getByText("Currently viewing this order")).toBeVisible();
      await expect(orderCard.locator("details")).toHaveAttribute("open", "");
      await expect(page.getByText("That reference wasn't found in your account history.")).toHaveCount(0);

      await page.goto(`/checkout/confirmed?ref=${encodeURIComponent(orderRef)}`);
      await expect(page.getByRole("heading", { name: "Order confirmed" })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("heading", { name: orderRef })).toBeVisible();
      await expect(page.getByText(/Order total|line item/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "View your orders" })).toHaveAttribute(
        "href",
        `/account?tab=orders&ref=${encodeURIComponent(orderRef)}`,
      );
    }

    await page.goto("/account");
    await page.getByRole("tab", { name: "Quote requests" }).click();
    const quotesPanel = page.getByRole("tabpanel", { name: "Quote requests" });
    const quoteHeading = quotesPanel.locator("article h3").first();
    if ((await quoteHeading.count()) > 0) {
      const quoteRef = (await quoteHeading.innerText()).trim();
      await page.goto(`/account?tab=quotes&ref=${encodeURIComponent(quoteRef)}`);
      await expect(page.getByRole("tab", { name: "Quote requests" })).toHaveAttribute("data-state", "active");
      const quoteCard = quotesPanel.locator("article").filter({ hasText: quoteRef }).first();
      await expect(quoteCard).toHaveAttribute("aria-current", "true");
      await expect(quoteCard.getByText("Currently viewing this quote request")).toBeVisible();
      await expect(quoteCard.locator("details")).toHaveAttribute("open", "");

      await page.goto(`/quote/confirmed?ref=${encodeURIComponent(quoteRef)}`);
      await expect(page.getByRole("heading", { name: "Quote request received" })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByRole("heading", { name: quoteRef })).toBeVisible();
      await expect(page.getByRole("link", { name: "View your quote requests" })).toHaveAttribute(
        "href",
        `/account?tab=quotes&ref=${encodeURIComponent(quoteRef)}`,
      );
    }

    await page.goto("/account?tab=orders&ref=TLB-19990101-000000");
    await expect(page.getByText("That reference wasn't found in your account history.")).toBeVisible();
    await expect(page.getByRole("tabpanel", { name: "Orders" })).toBeVisible();
    await expect(page.getByText(/exists for another|belongs to/i)).toHaveCount(0);
  });

  test("account commerce layout remains usable at 390, 768, and 1440", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Account dashboard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Profile details" })).toBeVisible({ timeout: 15_000 });
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(page.getByRole("tab", { name: "Orders" })).toBeVisible();
      const overflow = await page.evaluate(() => {
        const main = document.querySelector("#main-content");
        if (!main) return true;
        return main.scrollWidth > main.clientWidth + 1;
      });
      expect(overflow, `horizontal overflow in account main at ${width}`).toBe(false);
      const tabBox = await page.getByRole("tab", { name: "Orders" }).boundingBox();
      expect(tabBox?.height ?? 0).toBeGreaterThanOrEqual(40);
    }
  });

  test("safe redirect returns to checkout and quote; unsafe redirect stays internal", async ({ page }) => {
    await page.goto("/auth?redirect=/checkout");
    await expect(page).toHaveURL(/\/checkout/, { timeout: 15_000 });
    await page.goto("/auth?redirect=/quote");
    await expect(page).toHaveURL(/\/quote/, { timeout: 15_000 });
    await page.goto("/auth?redirect=https://evil.example");
    await expect(page).not.toHaveURL(/evil/);
    await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });
  });
});
