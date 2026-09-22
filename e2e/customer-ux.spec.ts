import { expect, test, type Page } from "@playwright/test";

async function waitHydrated(page: Page, selector: string) {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const key = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
    return Boolean(key);
  }, selector);
}

async function seedCart(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "tlb-store-v1",
      JSON.stringify({ cart: [{ id: "ac-002", qty: 1 }], quote: [{ id: "ac-002", qty: 1 }] }),
    );
  });
}

test.describe("CP33 customer UX", () => {
  test("SKU and slug search find the methanol product", async ({ page }) => {
    await page.goto("/product/ac-002");
    await expect(page.getByRole("heading", { name: /Methanol/i })).toBeVisible({ timeout: 15_000 });
    const sku = (await page.locator("dt", { hasText: "SKU" }).locator("xpath=following-sibling::dd[1]").innerText()).trim();
    expect(sku.length).toBeGreaterThan(0);

    await page.goto(`/shop?q=${encodeURIComponent(sku)}`);
    await expect(page.getByRole("link", { name: /Methanol/i }).first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/shop?q=ac-002");
    await expect(page.getByRole("link", { name: /Methanol/i }).first()).toBeVisible({ timeout: 15_000 });
  });

  test("invalid category is distinct; valid category still works", async ({ page }) => {
    await page.goto("/shop?category=does-not-exist");
    await expect(page.getByRole("heading", { name: "Category not found" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "All products" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "View all products" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse categories" })).toBeVisible();

    await page.goto("/shop?category=glassware");
    await expect(page.getByRole("heading", { name: "Glassware" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("article").first()).toBeVisible();
  });

  test("checkout keeps an existing contact draft", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "tlb-store-v1",
        JSON.stringify({ cart: [{ id: "ac-002", qty: 1 }], quote: [] }),
      );
      window.sessionStorage.setItem(
        "tlb-form-draft:checkout",
        JSON.stringify({
          name: "Draft Person",
          email: "draft@example.test",
          phone: "0244000000",
          institution: "Lab",
          address: "1 Draft Road",
          city: "Accra",
          notes: "keep me",
        }),
      );
    });
    await page.goto("/checkout");
    await expect(page.getByLabel("Contact name")).toHaveValue("Draft Person", { timeout: 15_000 });
    await expect(page.getByLabel("Email")).toHaveValue("draft@example.test");
    await expect(page.getByLabel("Phone")).toHaveValue("0244000000");
    await expect(page.getByLabel("Delivery address")).toHaveValue("1 Draft Road");
  });

  test("guest checkout and quote send a safe return path", async ({ page }) => {
    await seedCart(page);
    await page.goto("/checkout");
    await expect(page.getByText("Sign in to complete your order.")).toBeVisible({ timeout: 15_000 });
    await page.locator('a[href*="redirect=%2Fcheckout"]').first().click();
    await expect(page).toHaveURL(/\/auth\?redirect=%2Fcheckout/);

    await page.goto("/quote");
    await expect(page.getByText("Sign in to submit a quote request.")).toBeVisible({ timeout: 15_000 });
    await page.locator('a[href*="redirect=%2Fquote"]').first().click();
    await expect(page).toHaveURL(/\/auth\?redirect=%2Fquote/);
  });

  test("unsafe redirect is stripped from auth", async ({ page }) => {
    await page.goto("/auth?redirect=https://evil.example");
    await expect(page).toHaveURL(/\/auth/);
    await expect(page).not.toHaveURL(/evil/);
    await expect(page.locator('a[href*="evil"]')).toHaveCount(0);

    await page.goto("/auth?redirect=//evil.example");
    await expect(page).not.toHaveURL(/evil/);

    await page.goto("/auth?redirect=javascript:alert(1)");
    await expect(page).not.toHaveURL(/javascript/);
  });

  test("homepage no longer presents best sellers as a ranking", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "New in catalogue" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Best sellers" })).toHaveCount(0);
    await expect(page.getByText("1,200+")).toHaveCount(0);
  });

  test("anonymous navigation does not expose Experiments", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation").getByRole("link", { name: "My experiments" })).toHaveCount(0);
    await expect(page.locator("header").getByRole("link", { name: "My experiments" })).toHaveCount(0);
  });

  test("forgot password UI uses neutral confirmation and does not send custom mail", async ({ page }) => {
    let recoverCalled = 0;
    await page.route("**/auth/v1/recover**", async (route) => {
      recoverCalled += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await page.goto("/auth");
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await page.getByLabel("Email").fill("nobody@example.test");
    await page.getByRole("button", { name: "Send reset instructions" }).click();
    await expect(
      page.getByText("If an account exists for that email, we'll send instructions to reset your password."),
    ).toBeVisible();
    expect(recoverCalled).toBe(1);
  });

  test("in-stock filter updates the URL", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: "All products" })).toBeVisible();
    await waitHydrated(page, "#filter-in-stock");
    await page.getByRole("checkbox", { name: "In stock only" }).click();
    await expect(page).toHaveURL(/inStock=true/);
  });

  test("header search reflects shop query", async ({ page }) => {
    await page.goto("/shop?q=methanol");
    await expect(page.getByRole("searchbox", { name: "Search products" }).first()).toHaveValue("methanol");
  });

  test("category menu works without hover", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Shop by category" }).click();
    await page.getByRole("link", { name: "Glassware" }).first().click();
    await expect(page).toHaveURL(/category=glassware/);
    await expect(page.getByRole("heading", { name: "Glassware" })).toBeVisible();
  });
});

test.describe("CP33 mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile menu has an accessible name and category list", async ({ page }) => {
    await page.goto("/");
    await waitHydrated(page, 'button[aria-label="Open menu"]');
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Menu" })).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("link", { name: "Glassware" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("dialog").getByRole("link", { name: "My experiments" })).toHaveCount(0);
  });

  test("auth has one visible page heading", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("heading", { level: 1, name: "Accounts built for laboratories" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });
});
