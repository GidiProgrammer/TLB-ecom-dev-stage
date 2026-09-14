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
    await expect(page.getByText(creds.email, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Admin overview" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /admin/i })).toHaveCount(0);

    await expect(page.getByRole("heading", { name: "Profile details" })).toBeVisible();
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

  test("sign out prevents authenticated account access", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Account dashboard" })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
    await page.goto("/account");
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
  });
});
