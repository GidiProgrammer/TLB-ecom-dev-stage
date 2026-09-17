import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mapOrderError } from "@/lib/order-errors";

const orderInputSchema = z.object({
  userId: z.string().uuid(),
  submissionNonce: z.string().uuid(),
  institution: z.string().trim().max(200).nullable(),
  shipping: z.object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().min(1).max(50),
    address: z.string().trim().min(1).max(500),
    city: z.string().trim().min(1).max(120),
    notes: z.string().trim().max(2000).optional(),
  }),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => orderInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (data.userId !== context.userId) {
      throw new Error("Unauthorized: user does not match the signed-in account");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const shippingAddress = data.shipping.notes
      ? `${data.shipping.address} — ${data.shipping.notes}`
      : data.shipping.address;

    const { data: orderId, error } = await supabaseAdmin.rpc("create_order_with_items", {
      p_user_id: data.userId,
      p_institution: data.institution ?? "",
      p_shipping_name: data.shipping.name,
      p_shipping_email: data.shipping.email,
      p_shipping_phone: data.shipping.phone,
      p_shipping_address: shippingAddress,
      p_shipping_city: data.shipping.city,
      p_items: data.items,
      p_submission_nonce: data.submissionNonce,
    });

    if (error) {
      console.error("[createOrder]", error.message);
      throw new Error(mapOrderError(error.message));
    }

    if (!orderId) {
      throw new Error("Order was not created");
    }

    const id = String(orderId);
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, reference, shipping_email, user_id")
      .eq("id", id)
      .maybeSingle();

    if (order?.user_id && order.user_id !== context.userId) {
      throw new Error("Unauthorized: user does not match the signed-in account");
    }

    const result = { orderId: id, reference: order?.reference ?? id };

    const { enqueueOrderCreatedFromRecord, notifyAfterCommerceCommit } = await import(
      "@/server/mail/commerce"
    );
    const { createOrderCreatedNotification, runAfterCommerceCommit } = await import(
      "@/server/notifications/commerce"
    );

    return notifyAfterCommerceCommit(result, () =>
      runAfterCommerceCommit([
        {
          channel: "transactional-email",
          run: () =>
            enqueueOrderCreatedFromRecord({
              id,
              reference: result.reference,
              shippingEmail: order?.shipping_email ?? null,
            }),
        },
        {
          channel: "customer-notifications",
          run: () =>
            createOrderCreatedNotification({
              id,
              userId: order?.user_id ?? context.userId,
              reference: result.reference,
            }),
        },
      ]),
    );
  });
