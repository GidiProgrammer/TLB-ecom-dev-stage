import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useAdminProfiles } from "@/lib/queries/admin";
import { AdminLoading, AdminPageHeader, AdminPageStack } from "@/components/admin/AdminPageHeader";
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
    <AdminPageStack>
      <AdminPageHeader
        title="Accounts"
        description="Institutional approval is limited to the admin role. Staff can view accounts."
      />
      {profiles.isLoading ? (
        <AdminLoading label="Loading accounts" />
      ) : profiles.error ? (
        <p className="text-sm text-muted-foreground">Could not load accounts. Please try again.</p>
      ) : (
        <AccountWorkspace profiles={profiles.data ?? []} canApprove={access.isAdmin} />
      )}
    </AdminPageStack>
  );
}
