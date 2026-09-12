import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadLocalEnv() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.replace(/\r$/, "");
    const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    const value = m[2].replace(/^["']|["']$/g, "").trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

export function e2eCredentials() {
  loadLocalEnv();
  const email = process.env["E2E_USER_EMAIL"]?.trim();
  const password = process.env["E2E_USER_PASSWORD"]?.trim();
  if (!email || !password) return null;
  return { email, password };
}
