import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ENV_PATH = ".env";
const EMAIL = "e2e-customer@tlb-labmart.test";

function loadEnv(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

function upsertEnv(path, updates) {
  const raw = existsSync(path) ? readFileSync(path, "utf8") : "";
  const lines = raw.split("\n");
  const keys = new Set(Object.keys(updates));
  const next = lines.map((line) => {
    const m = line.match(/^([A-Z0-9_]+)=/);
    if (m && keys.has(m[1])) {
      keys.delete(m[1]);
      return `${m[1]}=${updates[m[1]]}`;
    }
    return line;
  });
  for (const key of keys) next.push(`${key}=${updates[key]}`);
  const text = next.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
  writeFileSync(path, text.endsWith("\n") ? text : `${text}\n`);
}

const env = { ...loadEnv(ENV_PATH), ...process.env };
const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").trim();
const service = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (!url || !service) {
  console.error("missing_admin_env");
  process.exit(1);
}
if (!/^https?:\/\//i.test(url)) {
  console.error("invalid_supabase_url_shape");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
if (listError) {
  console.error("list_users_failed");
  process.exit(1);
}

const found = (existing.users ?? []).find((u) => u.email === EMAIL);
if (found) {
  const { data: roles, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", found.id);
  if (roleError) {
    console.error("role_check_failed");
    process.exit(1);
  }
  if ((roles ?? []).length > 0) {
    console.error("existing_user_has_roles");
    process.exit(1);
  }
  upsertEnv(ENV_PATH, { E2E_USER_EMAIL: EMAIL });
  console.log(JSON.stringify({ created: false, reused: true, hasPasswordInEnv: Boolean(env.E2E_USER_PASSWORD) }));
  process.exit(0);
}

const password = randomBytes(24).toString("base64url");
const { data, error } = await admin.auth.admin.createUser({
  email: EMAIL,
  password,
  email_confirm: true,
  user_metadata: {
    full_name: "TLB E2E Customer",
    phone: "+233000000000",
    account_type: "individual",
  },
});

if (error || !data.user) {
  console.error("create_user_failed");
  process.exit(1);
}

const { data: roles, error: roleError } = await admin.from("user_roles").select("role").eq("user_id", data.user.id);
if (roleError) {
  console.error("role_check_failed");
  process.exit(1);
}
if ((roles ?? []).length > 0) {
  console.error("user_has_roles");
  process.exit(1);
}

const { data: profile, error: profileError } = await admin
  .from("profiles")
  .select("account_type, approval_status, full_name")
  .eq("id", data.user.id)
  .maybeSingle();
if (profileError) {
  console.error("profile_check_failed");
  process.exit(1);
}

upsertEnv(ENV_PATH, { E2E_USER_EMAIL: EMAIL, E2E_USER_PASSWORD: password });
console.log(
  JSON.stringify({
    created: true,
    reused: false,
    accountType: profile?.account_type ?? null,
    approvalStatus: profile?.approval_status ?? null,
    hasName: Boolean(profile?.full_name),
    roles: 0,
  }),
);
