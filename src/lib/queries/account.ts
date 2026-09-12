import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AccountOrderItem = Pick<
  Tables<"order_items">,
  "id" | "product_id" | "product_name" | "unit_price" | "quantity" | "line_total"
>;

export type AccountOrder = Tables<"orders"> & {
  order_items: AccountOrderItem[];
};

export type AccountQuoteItem = Pick<
  Tables<"quote_items">,
  "id" | "product_id" | "product_name" | "quantity" | "quoted_price"
>;

export type AccountQuote = Tables<"quotes"> & {
  quote_items: AccountQuoteItem[];
};

function loadError(fallback: string, error: { message: string } | null): Error | null {
  return error ? new Error(fallback) : null;
}

export async function fetchAccountProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  const err = loadError("Could not load your account details", error);
  if (err) throw err;
  return data;
}

export async function fetchAccountOrders(): Promise<AccountOrder[]> {
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

  const itemsByOrder = new Map<string, AccountOrderItem[]>();
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

export async function fetchAccountQuotes(): Promise<AccountQuote[]> {
  const { data: quotes, error } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });
  const err = loadError("Could not load quote requests", error);
  if (err) throw err;
  if (!quotes?.length) return [];

  const { data: items, error: itemError } = await supabase
    .from("quote_items")
    .select("id, quote_id, product_id, product_name, quantity, quoted_price")
    .in(
      "quote_id",
      quotes.map((quote) => quote.id),
    );
  const itemErr = loadError("Could not load quote requests", itemError);
  if (itemErr) throw itemErr;

  const itemsByQuote = new Map<string, AccountQuoteItem[]>();
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

export function useAccountProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchAccountProfile(userId!),
  });
}

export function useAccountOrders(userId: string | undefined) {
  return useQuery({
    queryKey: ["account-orders", userId],
    enabled: Boolean(userId),
    queryFn: fetchAccountOrders,
  });
}

export function useAccountQuotes(userId: string | undefined) {
  return useQuery({
    queryKey: ["account-quotes", userId],
    enabled: Boolean(userId),
    queryFn: fetchAccountQuotes,
  });
}
