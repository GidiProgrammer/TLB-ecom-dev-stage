import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { formatGHS } from "@/lib/catalog-utils";
import { listAdminProducts } from "@/lib/catalog-ops";
import { useAdminOrders, useAdminQuotes, useAdminProfiles } from "@/lib/queries/admin";
import { AdminLoading, AdminPageHeader, AdminPageStack, AdminPanel } from "@/components/admin/AdminPageHeader";
import { cn } from "@/lib/utils";
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
    { label: "Orders", value: String(orderRows.length), tone: "admin-kpi--violet" },
    { label: "Pending orders", value: String(pendingOrders.length), tone: "admin-kpi--gold" },
    { label: "Quotes", value: String(quoteRows.length), tone: "admin-kpi--teal" },
    { label: "Active products", value: String(activeProducts.length), tone: "admin-kpi--sky" },
    { label: "Accounts", value: String(profileRows.length), tone: "admin-kpi--sand" },
  ];

  const attention = [
    { label: "Pending orders", count: pendingOrders.length, to: "/admin/orders" },
    { label: "Quotes to follow up", count: pendingQuotes.length, to: "/admin/quotes" },
    { label: "Account approvals", count: pendingApprovals.length, to: "/admin/accounts" },
    { label: "Low stock", count: lowStock.length, to: "/admin/products" },
  ].filter((item) => item.count > 0);

  return (
    <AdminPageStack>
      <AdminPageHeader
        eyebrow="Staff"
        title="Overview"
        description="Organisation-wide orders, quotes, accounts and catalogue coverage for TLB staff."
      />

      <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <div className="admin-kpi-featured col-span-2 flex min-w-0 flex-col justify-between rounded-lg px-5 py-5 sm:col-span-3 xl:col-span-2 xl:row-span-2">
          <p className="text-xs font-medium text-muted-foreground">Listed order value</p>
          <p className="mt-3 text-4xl font-bold tracking-tight text-foreground tabular-nums sm:text-5xl">
            {formatGHS(listedValue)}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">All listed orders</p>
        </div>
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={cn("admin-kpi flex min-h-32 min-w-0 flex-col justify-between rounded-lg px-4 py-4", kpi.tone)}
          >
            <p className="truncate text-xs font-medium text-muted-foreground">{kpi.label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground tabular-nums">{kpi.value}</p>
          </div>
        ))}
      </div>
      {orders.isLoading || quotes.isLoading || profiles.isLoading || catalogue.isLoading || attention.length === 0 ? null : (
        <AdminPanel className="shrink-0">
          <div className="flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
            {attention.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="flex min-h-11 flex-1 items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-admin-row-hover"
              >
                <span className="text-muted-foreground">{item.label}</span>
                <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-sm font-semibold text-primary tabular-nums">{item.count}</span>
              </Link>
            ))}
          </div>
        </AdminPanel>
      )}

      <div>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent orders</h2>
          <Link to="/admin/orders" className="text-sm font-medium text-primary hover:underline">
            All orders
          </Link>
        </div>
        {orders.isLoading ? (
          <AdminLoading label="Loading orders" />
        ) : orders.error ? (
          <p className="text-sm text-muted-foreground">Could not load orders. Please try again.</p>
        ) : (
          <OrderWorkspace orders={orderRows} compact />
        )}
      </div>
    </AdminPageStack>
  );
}
