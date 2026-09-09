import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const orderInputSchema = z.object({
  userId: z.string().uuid(),
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

    const { data: orderId, error } = await supabaseAdmin.rpc("create_order_with_items" as never, {
      p_user_id: data.userId,
      p_institution: data.institution,
      p_shipping_name: data.shipping.name,
      p_shipping_email: data.shipping.email,
      p_shipping_phone: data.shipping.phone,
      p_shipping_address: shippingAddress,
      p_shipping_city: data.shipping.city,
      p_items: data.items,
    } as never);

    if (error) {
      throw new Error(error.message);
    }

    if (!orderId) {
      throw new Error("Order was not created");
    }

    return { orderId: String(orderId) };
  });
