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

    const { data: existing, error: loadError } = await supabaseAdmin
      .from("orders")
      .select("id, reference, status, shipping_email")
      .eq("id", data.orderId)
      .maybeSingle();

    if (loadError) {
      console.error("[updateOrderStatus]", loadError.message);
      throw new Error("Could not update order status");
    }
    if (!existing) {
      throw new Error("Order not found");
    }

    if (existing.status === data.status) {
      return { reference: existing.reference, status: existing.status };
    }

    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.orderId)
      .select("id, reference, status, shipping_email")
      .maybeSingle();

    if (error) {
      console.error("[updateOrderStatus]", error.message);
      throw new Error("Could not update order status");
    }
    if (!row) {
      throw new Error("Order not found");
    }

    const result = { reference: row.reference, status: row.status };
    const { enqueueOrderLifecycleFromTransition, notifyAfterCommerceCommit } = await import(
      "@/server/mail/commerce"
    );

    return notifyAfterCommerceCommit(result, () =>
      enqueueOrderLifecycleFromTransition({
        id: row.id,
        reference: row.reference,
        shippingEmail: row.shipping_email,
        previousStatus: existing.status,
        nextStatus: row.status,
      }),
    );
  });

export const updateQuoteStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => updateQuoteStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    await loadStaffAccess(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: loadError } = await supabaseAdmin
      .from("quotes")
      .select("id, reference, status, contact_email")
      .eq("id", data.quoteId)
      .maybeSingle();

    if (loadError) {
      console.error("[updateQuoteStatus]", loadError.message);
      throw new Error("Could not update quote status");
    }
    if (!existing) {
      throw new Error("Quote not found");
    }

    if (existing.status === data.status) {
      return { reference: existing.reference, status: existing.status };
    }

    const { data: row, error } = await supabaseAdmin
      .from("quotes")
      .update({ status: data.status })
      .eq("id", data.quoteId)
      .select("id, reference, status, contact_email")
      .maybeSingle();

    if (error) {
      console.error("[updateQuoteStatus]", error.message);
      throw new Error("Could not update quote status");
    }
    if (!row) {
      throw new Error("Quote not found");
    }

    const result = { reference: row.reference, status: row.status };
    const { enqueueQuoteLifecycleFromTransition, notifyAfterCommerceCommit } = await import(
      "@/server/mail/commerce"
    );

    return notifyAfterCommerceCommit(result, () =>
      enqueueQuoteLifecycleFromTransition({
        id: row.id,
        reference: row.reference,
        contactEmail: row.contact_email,
        previousStatus: existing.status,
        nextStatus: row.status,
      }),
    );
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

    const { data: existing, error: loadError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, institution_name, approval_status")
      .eq("id", data.profileId)
      .maybeSingle();

    if (loadError) {
      console.error("[updateProfileApproval]", loadError.message);
      throw new Error("Could not update approval status");
    }
    if (!existing) {
      throw new Error("Profile not found");
    }

    if (existing.approval_status === data.approvalStatus) {
      return {
        fullName: existing.full_name,
        institutionName: existing.institution_name,
        approvalStatus: existing.approval_status,
      };
    }

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

    const result = {
      fullName: row.full_name,
      institutionName: row.institution_name,
      approvalStatus: row.approval_status,
    };

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(row.id);
    if (authError) {
      console.error("[updateProfileApproval] auth email lookup", authError.message);
    }

    const { enqueueProfileApprovalFromTransition, notifyAfterCommerceCommit } = await import(
      "@/server/mail/commerce"
    );

    return notifyAfterCommerceCommit(result, () =>
      enqueueProfileApprovalFromTransition({
        id: row.id,
        email: authData?.user?.email ?? null,
        fullName: row.full_name,
        previousStatus: existing.approval_status,
        nextStatus: row.approval_status,
      }),
    );
  });
