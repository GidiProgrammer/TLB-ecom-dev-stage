import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { Constants } from "@/integrations/supabase/types";
import { loadStaffAccess } from "@/lib/staff";

const ORDER_STATUSES = Constants.public.Enums.order_status;
const QUOTE_STATUSES = Constants.public.Enums.quote_status;

const orderStatusSchema = z.enum(ORDER_STATUSES);
const quoteStatusSchema = z.enum(QUOTE_STATUSES);

const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: orderStatusSchema,
});

const updateQuoteStatusSchema = z.object({
  quoteId: z.string().uuid(),
  status: quoteStatusSchema,
});

const updateQuoteItemPriceSchema = z.object({
  quoteItemId: z.string().uuid(),
  quotedPrice: z.number(),
});

function parseQuotedPrice(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Invalid price");
  }
  if (value < 0) {
    throw new Error("Invalid price");
  }
  const cents = Math.round(value * 100);
  if (cents > 9_999_999_999) {
    throw new Error("Invalid price");
  }
  return cents / 100;
}

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => updateOrderStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    await loadStaffAccess(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.orderId)
      .select("id, reference, status")
      .maybeSingle();

    if (error) {
      console.error("[updateOrderStatus]", error.message);
      throw new Error("Could not update order status");
    }
    if (!row) {
      throw new Error("Order not found");
    }

    return { reference: row.reference, status: row.status };
  });

export const updateQuoteStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => updateQuoteStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    await loadStaffAccess(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("quotes")
      .update({ status: data.status })
      .eq("id", data.quoteId)
      .select("id, reference, status")
      .maybeSingle();

    if (error) {
      console.error("[updateQuoteStatus]", error.message);
      throw new Error("Could not update quote status");
    }
    if (!row) {
      throw new Error("Quote not found");
    }

    return { reference: row.reference, status: row.status };
  });

export const updateQuoteItemPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => updateQuoteItemPriceSchema.parse(data))
  .handler(async ({ data, context }) => {
    await loadStaffAccess(context.userId);
    const quotedPrice = parseQuotedPrice(data.quotedPrice);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("quote_items")
      .update({ quoted_price: quotedPrice })
      .eq("id", data.quoteItemId)
      .select("id, quoted_price")
      .maybeSingle();

    if (error) {
      console.error("[updateQuoteItemPrice]", error.message);
      throw new Error("Could not update quoted price");
    }
    if (!row) {
      throw new Error("Quote item not found");
    }

    return { quoteItemId: row.id, quotedPrice: row.quoted_price };
  });

const APPROVAL_STATUSES = Constants.public.Enums.approval_status;
const approvalStatusSchema = z.enum(APPROVAL_STATUSES);

const updateProfileApprovalSchema = z.object({
  profileId: z.string().uuid(),
  approvalStatus: approvalStatusSchema,
});

export const updateProfileApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => updateProfileApprovalSchema.parse(data))
  .handler(async ({ data, context }) => {
    const access = await loadStaffAccess(context.userId);
    if (!access.isAdmin) {
      throw new Error("Unauthorized");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("profiles")
      .update({ approval_status: data.approvalStatus })
      .eq("id", data.profileId)
      .select("id, full_name, institution_name, approval_status")
      .maybeSingle();

    if (error) {
      console.error("[updateProfileApproval]", error.message);
      throw new Error("Could not update approval status");
    }
    if (!row) {
      throw new Error("Profile not found");
    }

    return {
      fullName: row.full_name,
      institutionName: row.institution_name,
      approvalStatus: row.approval_status,
    };
  });
