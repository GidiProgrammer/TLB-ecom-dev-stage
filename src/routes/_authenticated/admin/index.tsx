import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { formatGHS } from "@/lib/catalog-utils";
import { listAdminProducts } from "@/lib/catalog-ops";
import { useAdminOrders, useAdminQuotes, useAdminProfiles } from "@/lib/queries/admin";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminPageHeader";
import { OrderWorkspace } from "@/components/admin/OrderWorkspace";
import { privatePageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () =>
    privatePageHead("Admin overview — TLB Enterprise", "Internal overview of orders, quotes and catalogue coverage."),
  component: AdminOverview,
});

function AdminOverview() {
  const { user } = useAuth();
  const orders = useAdminOrders(user?.id);
  const quotes = useAdminQuotes(user?.id);
  const profiles = useAdminProfiles(user?.id);
  const catalogue = useQuery({ queryKey: ["admin-catalogue"], queryFn: () => listAdminProducts() });

  const orderRows = orders.data ?? [];
  const quoteRows = quotes.data ?? [];
  const profileRows = profiles.data ?? [];
  const products = catalogue.data ?? [];

  const pendingOrders = orderRows.filter((o) => o.status === "pending");
  const pendingQuotes = quoteRows.filter(
    (q) => q.status === "submitted" || q.status === "reviewed" || q.quote_items.some((i) => i.quoted_price == null),
  );
  const pendingApprovals = profileRows.filter((p) => p.approval_status === "pending");
  const activeProducts = products.filter((p) => p.is_active && !p.deleted_at);
  const lowStock = products.filter(
    (p) => !p.deleted_at && p.stock_quantity <= p.low_stock_threshold,
  );
  const listedValue = orderRows.reduce((s, o) => s + Number(o.total), 0);

  const kpis = [
    { label: "Orders", value: String(orderRows.length) },
    { label: "Pending orders", value: String(pendingOrders.length) },
    { label: "Quotes", value: String(quoteRows.length) },
    { label: "Active products", value: String(activeProducts.length) },
    { label: "Accounts", value: String(profileRows.length) },
    { label: "Listed order value", value: formatGHS(listedValue) },
  ];

  const attention = [
    { label: "Pending orders", count: pendingOrders.length, to: "/admin/orders" },
    { label: "Quotes needing follow-up", count: pendingQuotes.length, to: "/admin/quotes" },
    { label: "Pending account approvals", count: pendingApprovals.length, to: "/admin/accounts" },
    { label: "Low stock products", count: lowStock.length, to: "/admin/products" },
  ].filter((item) => item.count > 0);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Admin overview"
        description="Operations console for TLB e-commerce. Lists are organisation-wide for staff, enforced by row-level security."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <AdminPanel key={kpi.label} className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{kpi.value}</p>
          </AdminPanel>
        ))}
      </div>

      <AdminPanel className="p-5">
        <h2 className="text-base font-semibold">Needs attention</h2>
        {orders.isLoading || quotes.isLoading || profiles.isLoading || catalogue.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : attention.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No follow-up items from the current lists.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {attention.map((item) => (
              <li key={item.label} className="flex items-center justify-between py-2 text-sm">
                <span>{item.label}</span>
                <Link to={item.to} className="font-medium text-primary hover:underline">
                  {item.count}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>

      <div>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-base font-semibold">Recent orders</h2>
          <Link to="/admin/orders" className="text-sm font-medium text-primary hover:underline">
            All orders
          </Link>
        </div>
        {orders.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading orders…</p>
        ) : orders.error ? (
          <p className="text-sm text-muted-foreground">Could not load orders. Please try again.</p>
        ) : (
          <OrderWorkspace orders={orderRows} compact />
        )}
      </div>
    </div>
  );
}
