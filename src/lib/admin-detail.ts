import type { Enums } from "../integrations/supabase/types.ts";
import { quoteLineEstimate, quoteQuotedTotal } from "./account-display.ts";

export type DetailFact = { label: string; value: string };

/** Blank and whitespace-only snapshots are omitted. They are not displayed as empty labels. */
export function recordedText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export type OrderDetailItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderDetailModel = {
  reference: string;
  status: Enums<"order_status">;
  createdAt: string;
  updatedAt: string;
  customer: DetailFact[];
  delivery: DetailFact[];
  items: OrderDetailItem[];
  subtotal: number;
  total: number;
  paymentReference: string | null;
};

type OrderDetailInput = {
  reference: string;
  status: Enums<"order_status">;
  created_at: string;
  updated_at: string;
  shipping_name: string | null;
  shipping_email: string | null;
  shipping_phone: string | null;
  institution: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  subtotal: number;
  total: number;
  payment_reference: string | null;
  order_items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
};

export function orderDetailModel(order: OrderDetailInput): OrderDetailModel {
  const customer: DetailFact[] = [];
  const name = recordedText(order.shipping_name);
  const email = recordedText(order.shipping_email);
  const phone = recordedText(order.shipping_phone);
  const institution = recordedText(order.institution);
  if (name) customer.push({ label: "Name", value: name });
  if (email) customer.push({ label: "Email", value: email });
  if (phone) customer.push({ label: "Phone", value: phone });
  if (institution) customer.push({ label: "Institution", value: institution });

  const delivery: DetailFact[] = [];
  const address = recordedText(order.shipping_address);
  const city = recordedText(order.shipping_city);
  if (address) delivery.push({ label: "Address", value: address });
  if (city) delivery.push({ label: "City", value: city });

  return {
    reference: order.reference,
    status: order.status,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    customer,
    delivery,
    items: order.order_items.map((item) => ({
      id: item.id,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      lineTotal: Number(item.line_total),
    })),
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    paymentReference: recordedText(order.payment_reference),
  };
}

export type QuoteDetailLine = {
  id: string;
  productName: string;
  quantity: number;
  quotedPrice: number | null;
  lineEstimate: number | null;
};

export type QuoteDetailModel = {
  reference: string;
  status: Enums<"quote_status">;
  createdAt: string;
  updatedAt: string;
  requester: DetailFact[];
  notes: string | null;
  lines: QuoteDetailLine[];
  total: number | null;
  incomplete: boolean;
};

type QuoteDetailInput = {
  reference: string;
  status: Enums<"quote_status">;
  created_at: string;
  updated_at: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  institution: string | null;
  notes: string | null;
  quote_items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    quoted_price: number | null;
  }>;
};

export function quoteDetailModel(quote: QuoteDetailInput): QuoteDetailModel {
  const requester: DetailFact[] = [];
  const name = recordedText(quote.contact_name);
  const email = recordedText(quote.contact_email);
  const phone = recordedText(quote.contact_phone);
  const institution = recordedText(quote.institution);
  if (name) requester.push({ label: "Name", value: name });
  if (email) requester.push({ label: "Email", value: email });
  if (phone) requester.push({ label: "Phone", value: phone });
  if (institution) requester.push({ label: "Institution", value: institution });

  const lines = quote.quote_items.map((item) => ({
    id: item.id,
    productName: item.product_name,
    quantity: item.quantity,
    quotedPrice: item.quoted_price == null ? null : Number(item.quoted_price),
    lineEstimate: quoteLineEstimate(item.quantity, item.quoted_price),
  }));

  return {
    reference: quote.reference,
    status: quote.status,
    createdAt: quote.created_at,
    updatedAt: quote.updated_at,
    requester,
    notes: recordedText(quote.notes),
    lines,
    total: quoteQuotedTotal(quote.quote_items),
    incomplete: lines.some((line) => line.quotedPrice == null),
  };
}
