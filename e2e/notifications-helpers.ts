import { createClient } from "@supabase/supabase-js";
import { e2eCredentials, loadLocalEnv } from "./load-env";

export type SeededNotification = {
  id: string;
  title: string;
  href: string;
};

export function e2eAdmin() {
  loadLocalEnv();
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function resolveE2EUserId(): Promise<string | null> {
  const creds = e2eCredentials();
  const admin = e2eAdmin();
  if (!creds || !admin) return null;
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) return null;
  return data.users.find((user) => user.email?.toLowerCase() === creds.email.toLowerCase())?.id ?? null;
}

export async function seedCustomerNotifications(userId: string): Promise<SeededNotification[] | null> {
  const admin = e2eAdmin();
  if (!admin) return null;
  await cleanupCustomerNotifications(userId);
  const orderId = crypto.randomUUID();
  const quoteId = crypto.randomUUID();
  const rows = [
    {
      user_id: userId,
      event_key: `order.created:${orderId}`,
      event_type: "order.created",
      title: "E2E order received",
      body: "Playwright seeded order notice. Not a production order.",
      target_type: "order",
      target_id: orderId,
      href: "/account?tab=orders",
    },
    {
      user_id: userId,
      event_key: `quote.submitted:${quoteId}`,
      event_type: "quote.submitted",
      title: "E2E quote submitted",
      body: "Playwright seeded quote notice.",
      target_type: "quote",
      target_id: quoteId,
      href: "/account?tab=quotes",
    },
  ];
  const { data, error } = await admin.from("customer_notifications").insert(rows).select("id, title, href");
  if (error || !data?.length) return null;
  return data as SeededNotification[];
}

export async function cleanupCustomerNotifications(userId: string): Promise<void> {
  const admin = e2eAdmin();
  if (!admin) return;
  await admin.from("customer_notifications").delete().eq("user_id", userId).like("title", "E2E %");
}
