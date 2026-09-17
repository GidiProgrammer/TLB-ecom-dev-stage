import type { CustomerNotificationEventType } from "./events.ts";

export type CustomerNotificationRow = {
  id: string;
  userId: string;
  eventKey: string;
  eventType: CustomerNotificationEventType;
  title: string;
  body: string;
  targetType: string | null;
  targetId: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type CreateCustomerNotificationInput = {
  userId: string;
  eventKey: string;
  eventType: CustomerNotificationEventType;
  title: string;
  body: string;
  targetType?: string | null;
  targetId?: string | null;
  href?: string | null;
};

const memoryByKey = new Map<string, CustomerNotificationRow>();
const memoryById = new Map<string, CustomerNotificationRow>();

export function resetMemoryNotifications(): void {
  memoryByKey.clear();
  memoryById.clear();
}

export function listMemoryNotifications(): CustomerNotificationRow[] {
  return [...memoryByKey.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function nowIso(now = new Date()): string {
  return now.toISOString();
}

function toRow(input: CreateCustomerNotificationInput, now = new Date()): CustomerNotificationRow {
  const created = nowIso(now);
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    eventKey: input.eventKey,
    eventType: input.eventType,
    title: input.title,
    body: input.body,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    href: input.href ?? null,
    readAt: null,
    createdAt: created,
  };
}

export function createNotificationInMemory(
  input: CreateCustomerNotificationInput,
  now = new Date(),
): { row: CustomerNotificationRow; created: boolean } {
  const existing = memoryByKey.get(input.eventKey);
  if (existing) return { row: existing, created: false };
  const row = toRow(input, now);
  memoryByKey.set(input.eventKey, row);
  memoryById.set(row.id, row);
  return { row, created: true };
}

export function unreadCountForUserInMemory(userId: string): number {
  return listMemoryNotifications().filter((row) => row.userId === userId && row.readAt === null).length;
}

export function listForUserInMemory(userId: string): CustomerNotificationRow[] {
  return listMemoryNotifications().filter((row) => row.userId === userId);
}

export function markNotificationReadInMemory(id: string, userId: string, now = new Date()): number {
  const row = memoryById.get(id);
  if (!row || row.userId !== userId) return 0;
  if (row.readAt) return 0;
  row.readAt = nowIso(now);
  return 1;
}

export function markAllNotificationsReadInMemory(userId: string, now = new Date()): number {
  let count = 0;
  const stamp = nowIso(now);
  for (const row of memoryById.values()) {
    if (row.userId !== userId || row.readAt) continue;
    row.readAt = stamp;
    count += 1;
  }
  return count;
}

export function notificationsBackendKind(): "memory" | "supabase" {
  if (process.env["NOTIFICATIONS_BACKEND"] === "memory") {
    return "memory";
  }
  if (!process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
    return "memory";
  }
  return "supabase";
}

type DbRow = {
  id: string;
  user_id: string;
  event_key: string;
  event_type: CustomerNotificationEventType;
  title: string;
  body: string;
  target_type: string | null;
  target_id: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

function mapDbRow(row: DbRow): CustomerNotificationRow {
  return {
    id: row.id,
    userId: row.user_id,
    eventKey: row.event_key,
    eventType: row.event_type,
    title: row.title,
    body: row.body,
    targetType: row.target_type,
    targetId: row.target_id,
    href: row.href,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function createCustomerNotification(
  input: CreateCustomerNotificationInput,
): Promise<{ row: CustomerNotificationRow; created: boolean }> {
  if (!input.userId) {
    throw new Error("customer notification skipped: missing recipient user id");
  }

  if (notificationsBackendKind() === "memory") {
    return createNotificationInMemory(input);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const insert = {
    user_id: input.userId,
    event_key: input.eventKey,
    event_type: input.eventType,
    title: input.title,
    body: input.body,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    href: input.href ?? null,
  };

  const { data, error } = await supabaseAdmin
    .from("customer_notifications")
    .insert(insert)
    .select()
    .maybeSingle();

  if (!error && data) {
    return { row: mapDbRow(data as DbRow), created: true };
  }

  const duplicate =
    error?.code === "23505" ||
    error?.message?.toLowerCase().includes("duplicate") ||
    error?.message?.toLowerCase().includes("unique");

  if (!duplicate) {
    throw new Error(error?.message ?? "Failed to create customer notification");
  }

  const { data: existing, error: readError } = await supabaseAdmin
    .from("customer_notifications")
    .select()
    .eq("event_key", input.eventKey)
    .maybeSingle();

  if (readError || !existing) {
    throw new Error(readError?.message ?? "Notification exists but could not be loaded");
  }

  return { row: mapDbRow(existing as DbRow), created: false };
}

export async function markCustomerNotificationRead(id: string, userId: string): Promise<number> {
  if (notificationsBackendKind() === "memory") {
    return markNotificationReadInMemory(id, userId);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("mark_customer_notification_read", {
    p_id: id,
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function markAllCustomerNotificationsRead(userId: string): Promise<number> {
  if (notificationsBackendKind() === "memory") {
    return markAllNotificationsReadInMemory(userId);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("mark_all_customer_notifications_read", {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}
