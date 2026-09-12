import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StaffAccess = { isAdmin: boolean; isStaff: boolean };

/** Server-only role check. Call from createServerFn handlers, never from the browser client. */
export async function loadStaffAccess(userId: string): Promise<StaffAccess> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    console.error("[loadStaffAccess]", error.message);
    throw new Error("Unauthorized");
  }

  const roles = (data ?? []).map((row) => row.role);
  const isAdmin = roles.includes("admin");
  const isStaff = roles.includes("staff");
  if (!isAdmin && !isStaff) {
    throw new Error("Unauthorized");
  }

  return { isAdmin, isStaff };
}

export const requireStaffAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => loadStaffAccess(context.userId));
