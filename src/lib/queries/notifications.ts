import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";
import { safeInternalPath } from "@/lib/safe-redirect";
import type { Tables } from "@/integrations/supabase/types";

export type CustomerNotification = {
  id: string;
  eventType: string;
  title: string;
  body: string;
  targetType: string | null;
  targetId: string | null;
  href: string;
  readAt: string | null;
  createdAt: string;
};

const COLUMNS =
  "id, event_type, title, body, target_type, target_id, href, read_at, created_at" as const;

function mapRow(row: Pick<
  Tables<"customer_notifications">,
  "id" | "event_type" | "title" | "body" | "target_type" | "target_id" | "href" | "read_at" | "created_at"
>): CustomerNotification {
  return {
    id: row.id,
    eventType: row.event_type,
    title: row.title,
    body: row.body,
    targetType: row.target_type,
    targetId: row.target_id,
    href: safeInternalPath(row.href, "/account"),
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function fetchCustomerNotifications(): Promise<CustomerNotification[]> {
  const { data, error } = await supabase
    .from("customer_notifications")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[fetchCustomerNotifications]", error.message);
    throw new Error("Could not load notifications");
  }
  return (data ?? []).map(mapRow);
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("customer_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) {
    console.error("[fetchUnreadNotificationCount]", error.message);
    throw new Error("Could not load notifications");
  }
  return count ?? 0;
}

export type AccountNotificationSearch = {
  tab?: "orders" | "quotes";
  ref?: string;
};

export function accountSearchFromNotificationHref(href: string): AccountNotificationSearch {
  const safe = safeInternalPath(href, "/account");
  const search: AccountNotificationSearch = {};
  try {
    const url = new URL(safe, "https://tlb.internal");
    const tabRaw = url.searchParams.get("tab");
    const ref = url.searchParams.get("ref");
    if (tabRaw === "quotes" || tabRaw === "orders") search.tab = tabRaw;
    if (ref) search.ref = ref;
  } catch {
    return search;
  }
  return search;
}

export function notificationQueryKey(userId: string | undefined) {
  return ["customer-notifications", userId] as const;
}

export function unreadNotificationQueryKey(userId: string | undefined) {
  return ["customer-notifications-unread", userId] as const;
}

export function useCustomerNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: notificationQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: fetchCustomerNotifications,
  });
}

export function useUnreadNotificationCount(userId: string | undefined) {
  return useQuery({
    queryKey: unreadNotificationQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: fetchUnreadNotificationCount,
  });
}

export function useMarkNotificationRead(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead({ data: { notificationId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationQueryKey(userId) });
      await queryClient.invalidateQueries({ queryKey: unreadNotificationQueryKey(userId) });
    },
  });
}

export function useMarkAllNotificationsRead(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationQueryKey(userId) });
      await queryClient.invalidateQueries({ queryKey: unreadNotificationQueryKey(userId) });
    },
  });
}
