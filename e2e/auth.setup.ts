import { mkdirSync } from "node:fs";
import { expect, test as setup } from "@playwright/test";
import { e2eCredentials } from "./load-env";

setup("authenticate e2e customer", async ({ page }) => {
  const creds = e2eCredentials();
  if (!creds) {
    throw new Error("E2E_USER_EMAIL and E2E_USER_PASSWORD must be set in the local environment");
  }

  await page.goto("/auth");
  const email = page.locator("#si-email");
  const password = page.locator("#si-pass");
  await expect(email).toBeVisible();
  await expect(password).toBeVisible();

  // Auth markup is SSR'd. A submit before React hydrates native-GETs to `/auth?`
  // and never calls supabase.auth.signInWithPassword.
  await page.waitForFunction(() => {
    const form = document.querySelector("#si-email")?.closest("form");
    if (!form) return false;
    const key = Object.keys(form).find((k) => k.startsWith("__reactProps$"));
    return Boolean(key && typeof (form as unknown as Record<string, { onSubmit?: unknown }>)[key]?.onSubmit === "function");
  });

  await expect(async () => {
    await email.fill(creds.email);
    await expect(email).toHaveValue(creds.email);
  }).toPass();

  await password.fill(creds.password);
  await page
    .getByRole("tabpanel", { name: "Sign in" })
    .getByRole("button", { name: "Sign in" })
    .click();

  const signInFailed = page.getByText("Sign in failed");
  await Promise.race([
    page.waitForURL(/\/account/, { timeout: 20_000 }),
    signInFailed.waitFor({ timeout: 20_000 }).then(async () => {
      throw new Error("Sign in failed");
    }),
  ]);

  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByRole("heading", { name: "Account dashboard" })).toBeVisible();
  await expect(page.getByText(creds.email, { exact: true })).toBeVisible();

  mkdirSync("playwright/.auth", { recursive: true });
  await page.context().storageState({ path: "playwright/.auth/user.json" });
});
