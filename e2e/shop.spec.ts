import { expect, test, type Page } from "@playwright/test";

async function clearStore(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.removeItem("tlb-store-v1");
  });
}

test.describe("shop catalogue", () => {
  test("shop loads products", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: "All products" })).toBeVisible();
    await expect(page.getByRole("article").first()).toBeVisible({ timeout: 15_000 });
  });

  test("search returns matching products", async ({ page }) => {
    await page.goto("/shop?q=methanol");
    await expect(page.getByRole("heading", { name: /Results for/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Methanol/i }).first()).toBeVisible({ timeout: 15_000 });
  });

  test("category filtering works", async ({ page }) => {
    await page.goto("/shop");
    await page.getByRole("button", { name: "Glassware" }).click();
    await expect(page).toHaveURL(/category=glassware/);
    await expect(page.getByRole("heading", { name: "Glassware" })).toBeVisible();
    await expect(page.getByRole("article").first()).toBeVisible({ timeout: 15_000 });
  });

  test("sorting by price updates the URL", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByRole("article").first()).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Sort products").click();
    await page.getByRole("option", { name: "Price: low to high" }).click({ force: true, timeout: 10_000 });
    await expect(page).toHaveURL(/sort=price-asc/);
  });

  test("product detail loads", async ({ page }) => {
    await page.goto("/product/ac-002");
    await expect(page.getByRole("heading", { name: /Methanol/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("In stock", { exact: true }).first()).toBeVisible();
  });

  test("out-of-stock product cannot be added to cart when the catalogue has one", async ({ page }) => {
    await clearStore(page);
    await page.goto("/product/le-005");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible({ timeout: 15_000 });
    const oos = page.getByRole("button", { name: "Out of stock" });
    if (await oos.count()) {
      await expect(oos).toBeDisabled();
      await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(0);
      return;
    }
    test.info().annotations.push({
      type: "note",
      description: "le-005 is not out of stock in the live catalogue; skipped OOS assertion without mutating data.",
    });
  });
});

test.describe("cart honesty", () => {
  test("add to cart from product detail then see the cart", async ({ page }) => {
    await page.goto("/product/ac-002");
    await page.evaluate(() => window.localStorage.removeItem("tlb-store-v1"));
    await page.reload();
    await expect(page.getByRole("heading", { name: /Methanol/i })).toBeVisible({ timeout: 15_000 });
    const add = page.getByRole("button", { name: "Add to cart" });
    test.skip(!(await add.count()), "ac-002 is not purchasable in the live catalogue");
    await expect(add).toBeEnabled();
    await expect(async () => {
      await add.click();
      const stored = await page.evaluate(() => window.localStorage.getItem("tlb-store-v1") ?? "");
      expect(stored).toContain("ac-002");
    }).toPass({ timeout: 10_000 });
    await page.goto("/cart");
    await expect(page.getByRole("link", { name: /Methanol/i })).toBeVisible({ timeout: 15_000 });
  });
  test("cart persists after reload", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "tlb-store-v1",
        JSON.stringify({ cart: [{ id: "ac-002", qty: 1 }], quote: [] }),
      );
    });
    await page.goto("/cart");
    await expect(page.getByRole("link", { name: /Methanol/i })).toBeVisible({ timeout: 15_000 });
    await page.reload();
    await expect(page.getByRole("link", { name: /Methanol/i })).toBeVisible();
  });

  test("cart quantity cannot exceed known stock", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "tlb-store-v1",
        JSON.stringify({ cart: [{ id: "ac-002", qty: 1 }], quote: [] }),
      );
    });
    await page.goto("/cart");
    const qty = page.getByLabel(/Quantity for/i);
    await expect(qty).toBeVisible({ timeout: 15_000 });
    const max = await qty.getAttribute("max");
    expect(max).toBeTruthy();
    expect(Number(max)).toBeGreaterThan(0);
    await qty.fill(String(Number(max) + 50));
    await expect(page.getByText(/more than current stock/i)).toBeVisible();
  });

  test("missing cart product does not crash cart", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "tlb-store-v1",
        JSON.stringify({ cart: [{ id: "missing-slug-xyz", qty: 2 }], quote: [] }),
      );
    });
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
    await expect(page.getByText(/no longer available/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Proceed to checkout" })).toBeDisabled();
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("Your cart is empty")).toBeVisible();
  });

  test("unknown sort uses the default label and still lists products", async ({ page }) => {
    await page.goto("/shop?sort=not-a-sort");
    await expect(page.getByRole("heading", { name: "All products" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Loading products…")).toBeHidden({ timeout: 15_000 });
    await expect(page.getByRole("combobox", { name: "Sort products" })).toContainText("Name A–Z");
    await expect(page.getByRole("article").first()).toBeVisible();
    await expect(page.getByText(/^0 products$/)).toHaveCount(0);
  });

  test("checkout shows a missing product and stays disabled until it is removed", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "tlb-store-v1",
        JSON.stringify({ cart: [{ id: "missing-slug-xyz", qty: 1 }], quote: [] }),
      );
    });
    await page.goto("/checkout");
    await expect(page.getByText("This product is no longer available. Remove it before placing the order.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "Place order" })).toBeDisabled();
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("heading", { name: "Nothing to check out" })).toBeVisible();
  });

  test("clearing a quantity does not remove the cart or quote line", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "tlb-store-v1",
        JSON.stringify({ cart: [{ id: "ac-002", qty: 2 }], quote: [{ id: "ac-002", qty: 2 }] }),
      );
    });
    await page.goto("/cart");
    const qty = page.getByLabel(/Quantity for/i);
    await expect(qty).toBeVisible({ timeout: 15_000 });
    await qty.fill("");
    await qty.blur();
    await expect(qty).toHaveValue("2");
    await expect(page.getByRole("link", { name: /Methanol/i })).toBeVisible();
    await qty.fill("0");
    await qty.blur();
    await expect(qty).toHaveValue("2");

    await page.goto("/quote");
    const quoteQty = page.getByLabel(/Quantity for/i);
    await expect(quoteQty).toBeVisible({ timeout: 15_000 });
    await quoteQty.fill("");
    await quoteQty.blur();
    await expect(quoteQty).toHaveValue("2");
    await expect(page.getByRole("link", { name: /Methanol/i })).toBeVisible();
  });
});

test.describe("mobile catalogue", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile shop layout does not overflow", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: "All products" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(8);
    const category = await page.getByRole("button", { name: "All categories" }).boundingBox();
    expect(category?.height ?? 0).toBeGreaterThanOrEqual(40);
  });

  test("tablet shop does not overflow", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/shop");
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Glassware" })).toBeVisible({
      timeout: 15_000,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    const category = await page.getByRole("button", { name: "All categories" }).boundingBox();
    expect(category?.height ?? 0).toBeGreaterThanOrEqual(40);
  });

  test("mobile cart remains usable", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "tlb-store-v1",
        JSON.stringify({ cart: [{ id: "ac-002", qty: 1 }], quote: [] }),
      );
    });
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
    await expect(page.getByLabel(/Quantity for/i)).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("link", { name: "Proceed to checkout" }).or(page.getByRole("button", { name: "Proceed to checkout" })),
    ).toBeVisible();
  });
});
