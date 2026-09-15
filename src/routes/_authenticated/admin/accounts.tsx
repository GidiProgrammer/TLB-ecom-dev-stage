import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useAdminProfiles } from "@/lib/queries/admin";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AccountWorkspace } from "@/components/admin/AccountWorkspace";
import { privatePageHead } from "@/lib/seo";
import { Route as AdminRoute } from "./route";

export const Route = createFileRoute("/_authenticated/admin/accounts")({
  head: () => privatePageHead("Accounts — TLB Admin", "Customer account approval."),
  component: AdminAccountsPage,
});

function AdminAccountsPage() {
  const { user } = useAuth();
  const { access } = AdminRoute.useRouteContext();
  const profiles = useAdminProfiles(user?.id);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Accounts"
        description="Institutional approval is limited to the admin role. Staff can view accounts."
      />
      {profiles.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading accounts…</p>
      ) : profiles.error ? (
        <p className="text-sm text-muted-foreground">Could not load accounts. Please try again.</p>
      ) : (
        <AccountWorkspace profiles={profiles.data ?? []} canApprove={access.isAdmin} />
      )}
    </div>
  );
}
