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

test("hero controls stay available on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const tabs = page.getByRole("tablist", { name: "Hero slides" });
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole("tab", { selected: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Previous slide" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next slide" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
});

test("hero autoplay resumes after the pointer is released outside the hero", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("[data-autoplay]");
  await expect(hero).toHaveAttribute("data-autoplay", "running");
  const box = await hero.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;
  await page.mouse.move(box.x + 24, box.y + 24);
  await expect(hero).toHaveAttribute("data-autoplay", "paused");
  await page.mouse.down();
  await page.mouse.move(8, 8);
  await page.mouse.up();
  await expect(hero).toHaveAttribute("data-autoplay", "running");
});

test("hero autoplay does not advance under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Laboratory supplies for serious work.");
  await page.clock.fastForward(8_000);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Laboratory supplies for serious work.");
});

test("hero autoplay pauses while a slide control is focused", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("[data-autoplay]");
  await expect(hero).toHaveAttribute("data-autoplay", "running");
  await page.getByRole("button", { name: "Next slide" }).focus();
  await expect(hero).toHaveAttribute("data-autoplay", "paused");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
});

test("homepage does not overflow at 390, 768, or 1440", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Glassware" })).toBeVisible({
    timeout: 15_000,
  });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow at ${width}`).toBeLessThanOrEqual(1);
  }
});
