import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const markOneSchema = z.object({
  notificationId: z.string().uuid(),
});

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => markOneSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { markCustomerNotificationRead } = await import("@/server/notifications/store");
    const updated = await markCustomerNotificationRead(data.notificationId, context.userId);
    return { updated };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { markAllCustomerNotificationsRead } = await import("@/server/notifications/store");
    const updated = await markAllCustomerNotificationsRead(context.userId);
    return { updated };
  });
