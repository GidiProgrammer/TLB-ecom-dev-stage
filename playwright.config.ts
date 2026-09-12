import { defineConfig, devices } from "@playwright/test";
import { e2eCredentials } from "./e2e/load-env";

const hasE2E = Boolean(e2eCredentials());
const authState = "playwright/.auth/user.json";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: /mcp-.*\.(js|ts)$/,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5174",
    browserName: "chromium",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /auth\.setup\.ts|authenticated\.spec\.ts|mcp-.*\.(js|ts)$/,
      use: { ...devices["Desktop Chrome"] },
    },
    ...(hasE2E
      ? [
          {
            name: "setup",
            testMatch: /auth\.setup\.ts/,
            use: {
              ...devices["Desktop Chrome"],
              screenshot: "off" as const,
              video: "off" as const,
              trace: "off" as const,
            },
          },
          {
            name: "authenticated",
            dependencies: ["setup"],
            testMatch: /authenticated\.spec\.ts/,
            use: {
              ...devices["Desktop Chrome"],
              storageState: authState,
            },
          },
        ]
      : []),
  ],
  webServer: {
    command: "npm run dev -- --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
});
