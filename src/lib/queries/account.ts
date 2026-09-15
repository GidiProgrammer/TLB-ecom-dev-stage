import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";

const PROFILE_COLUMNS =
  "id, full_name, phone, account_type, institution_name, institution_type, approval_status" as const;

const ORDER_COLUMNS =
  "id, reference, created_at, status, total, shipping_name, shipping_city, shipping_address, shipping_phone, shipping_email, institution" as const;

const ORDER_ITEM_COLUMNS = "id, order_id, product_name, unit_price, quantity, line_total" as const;

const QUOTE_COLUMNS =
  "id, reference, created_at, status, notes, contact_name, contact_email, contact_phone, institution" as const;

const QUOTE_ITEM_COLUMNS = "id, quote_id, product_name, quantity, quoted_price" as const;

export type AccountProfile = Pick<
  Tables<"profiles">,
  | "id"
  | "full_name"
  | "phone"
  | "account_type"
  | "institution_name"
  | "institution_type"
  | "approval_status"
>;

export type AccountProfileUpdate = {
  full_name: string | null;
  phone: string | null;
  institution_name: string | null;
  institution_type: string | null;
};

export type AccountOrderItem = Pick<
  Tables<"order_items">,
  "id" | "product_name" | "unit_price" | "quantity" | "line_total"
>;

export type AccountOrder = {
  id: string;
  reference: string;
  created_at: string;
  status: Enums<"order_status">;
  total: number;
  shipping_name: string | null;
  shipping_city: string | null;
  shipping_address: string | null;
  shipping_phone: string | null;
  shipping_email: string | null;
  institution: string | null;
  order_items: AccountOrderItem[];
};

export type AccountQuoteItem = Pick<Tables<"quote_items">, "id" | "product_name" | "quantity" | "quoted_price">;

export type AccountQuote = {
  id: string;
  reference: string;
  created_at: string;
  status: Enums<"quote_status">;
  notes: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  institution: string | null;
  quote_items: AccountQuoteItem[];
};

function loadError(fallback: string, error: { message: string } | null): Error | null {
  return error ? new Error(fallback) : null;
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function fetchAccountProfile(userId: string): Promise<AccountProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  const err = loadError("Could not load your account details", error);
  if (err) throw err;
  return data;
}

export async function updateAccountProfile(userId: string, fields: AccountProfileUpdate): Promise<AccountProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: fields.full_name,
      phone: fields.phone,
      institution_name: fields.institution_name,
      institution_type: fields.institution_type,
    })
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .maybeSingle();
  if (error) {
    console.error("[updateAccountProfile]", error.message);
    throw new Error("Could not save your profile");
  }
  if (!data) throw new Error("Could not save your profile");
  return data;
}

export function normalizeProfileUpdate(input: {
  full_name: string;
  phone: string;
  institution_name: string;
  institution_type: string;
}): AccountProfileUpdate | { error: string } {
  const full_name = emptyToNull(input.full_name);
  if (!full_name || full_name.length > 120) {
    return { error: "Enter a name of up to 120 characters." };
  }
  const phone = emptyToNull(input.phone);
  if (phone && phone.length > 40) {
    return { error: "Enter a shorter phone number." };
  }
  const institution_name = emptyToNull(input.institution_name);
  if (institution_name && institution_name.length > 160) {
    return { error: "Enter a shorter institution name." };
  }
  const institution_type = emptyToNull(input.institution_type);
  if (institution_type && institution_type.length > 80) {
    return { error: "Enter a shorter institution type." };
  }
  return { full_name, phone, institution_name, institution_type };
}

export async function fetchAccountOrders(): Promise<AccountOrder[]> {
  const { data: orders, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false });
  const err = loadError("Could not load orders", error);
  if (err) throw err;
  if (!orders?.length) return [];

  const { data: items, error: itemError } = await supabase
    .from("order_items")
    .select(ORDER_ITEM_COLUMNS)
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
      product_name: item.product_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      line_total: item.line_total,
    });
    itemsByOrder.set(item.order_id, list);
  }

  return orders.map((order) => ({
    ...order,
    total: Number(order.total),
    order_items: itemsByOrder.get(order.id) ?? [],
  }));
}

export async function fetchOwnedOrderByReference(reference: string): Promise<AccountOrder | null> {
  const { data: order, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("reference", reference)
    .maybeSingle();
  const err = loadError("Could not load this order", error);
  if (err) throw err;
  if (!order) return null;

  const { data: items, error: itemError } = await supabase
    .from("order_items")
    .select(ORDER_ITEM_COLUMNS)
    .eq("order_id", order.id);
  const itemErr = loadError("Could not load this order", itemError);
  if (itemErr) throw itemErr;

  return {
    ...order,
    total: Number(order.total),
    order_items: (items ?? []).map((item) => ({
      id: item.id,
      product_name: item.product_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      line_total: item.line_total,
    })),
  };
}

export async function fetchAccountQuotes(): Promise<AccountQuote[]> {
  const { data: quotes, error } = await supabase
    .from("quotes")
    .select(QUOTE_COLUMNS)
    .order("created_at", { ascending: false });
  const err = loadError("Could not load quote requests", error);
  if (err) throw err;
  if (!quotes?.length) return [];

  const { data: items, error: itemError } = await supabase
    .from("quote_items")
    .select(QUOTE_ITEM_COLUMNS)
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

export async function fetchOwnedQuoteByReference(reference: string): Promise<AccountQuote | null> {
  const { data: quote, error } = await supabase
    .from("quotes")
    .select(QUOTE_COLUMNS)
    .eq("reference", reference)
    .maybeSingle();
  const err = loadError("Could not load this quote request", error);
  if (err) throw err;
  if (!quote) return null;

  const { data: items, error: itemError } = await supabase
    .from("quote_items")
    .select(QUOTE_ITEM_COLUMNS)
    .eq("quote_id", quote.id);
  const itemErr = loadError("Could not load this quote request", itemError);
  if (itemErr) throw itemErr;

  return {
    ...quote,
    quote_items: (items ?? []).map((item) => ({
      id: item.id,
      product_name: item.product_name,
      quantity: item.quantity,
      quoted_price: item.quoted_price,
    })),
  };
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
