import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useAdminOrders } from "@/lib/queries/admin";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OrderWorkspace } from "@/components/admin/OrderWorkspace";
import { privatePageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => privatePageHead("Orders — TLB Admin", "Organisation-wide order list."),
  component: AdminOrdersPage,
});

function AdminOrdersPage() {
  const { user } = useAuth();
  const orders = useAdminOrders(user?.id);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Orders"
        description="Update fulfilment status or cancel a pending order. Cancellation restocks through the server."
      />
      {orders.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading orders…</p>
      ) : orders.error ? (
        <p className="text-sm text-muted-foreground">Could not load orders. Please try again.</p>
      ) : (
        <OrderWorkspace orders={orders.data ?? []} />
      )}
    </div>
  );
}
