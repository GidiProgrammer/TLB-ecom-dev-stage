import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AdminOrderItem = Pick<
  Tables<"order_items">,
  "id" | "product_id" | "product_name" | "unit_price" | "quantity" | "line_total"
>;

export type AdminOrder = Tables<"orders"> & {
  order_items: AdminOrderItem[];
};

export type AdminQuoteItem = Pick<
  Tables<"quote_items">,
  "id" | "product_id" | "product_name" | "quantity" | "quoted_price"
>;

export type AdminQuote = Tables<"quotes"> & {
  quote_items: AdminQuoteItem[];
};

function loadError(fallback: string, error: { message: string } | null): Error | null {
  return error ? new Error(fallback) : null;
}

export async function fetchAdminOrders(): Promise<AdminOrder[]> {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  const err = loadError("Could not load orders", error);
  if (err) throw err;
  if (!orders?.length) return [];

  const { data: items, error: itemError } = await supabase
    .from("order_items")
    .select("id, order_id, product_id, product_name, unit_price, quantity, line_total")
    .in(
      "order_id",
      orders.map((order) => order.id),
    );
  const itemErr = loadError("Could not load orders", itemError);
  if (itemErr) throw itemErr;

  const itemsByOrder = new Map<string, AdminOrderItem[]>();
  for (const item of items ?? []) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      line_total: item.line_total,
    });
    itemsByOrder.set(item.order_id, list);
  }

  return orders.map((order) => ({
    ...order,
    order_items: itemsByOrder.get(order.id) ?? [],
  }));
}

export async function fetchAdminQuotes(): Promise<AdminQuote[]> {
  const { data: quotes, error } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });
  const err = loadError("Could not load quotes", error);
  if (err) throw err;
  if (!quotes?.length) return [];

  const { data: items, error: itemError } = await supabase
    .from("quote_items")
    .select("id, quote_id, product_id, product_name, quantity, quoted_price")
    .in(
      "quote_id",
      quotes.map((quote) => quote.id),
    );
  const itemErr = loadError("Could not load quotes", itemError);
  if (itemErr) throw itemErr;

  const itemsByQuote = new Map<string, AdminQuoteItem[]>();
  for (const item of items ?? []) {
    const list = itemsByQuote.get(item.quote_id) ?? [];
    list.push({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      quoted_price: item.quoted_price,
    });
    itemsByQuote.set(item.quote_id, list);
  }

  return quotes.map((quote) => ({
    ...quote,
    quote_items: itemsByQuote.get(quote.id) ?? [],
  }));
}

export function useAdminOrders(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-orders", userId],
    enabled: Boolean(userId),
    queryFn: fetchAdminOrders,
  });
}

export function useAdminQuotes(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-quotes", userId],
    enabled: Boolean(userId),
    queryFn: fetchAdminQuotes,
  });
}

export type AdminProfile = Pick<
  Tables<"profiles">,
  "id" | "full_name" | "phone" | "account_type" | "institution_name" | "institution_type" | "approval_status" | "created_at"
>;

export async function fetchAdminProfiles(): Promise<AdminProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, account_type, institution_name, institution_type, approval_status, created_at")
    .order("created_at", { ascending: false });
  const err = loadError("Could not load accounts", error);
  if (err) throw err;
  return data ?? [];
}

export function useAdminProfiles(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-profiles", userId],
    enabled: Boolean(userId),
    queryFn: fetchAdminProfiles,
  });
}
