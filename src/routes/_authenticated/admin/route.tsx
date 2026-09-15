import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { requireStaffAccess } from "@/lib/staff";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    try {
      const access = await requireStaffAccess();
      return { access };
    } catch {
      throw redirect({ to: "/account" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
