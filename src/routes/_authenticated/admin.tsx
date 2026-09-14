import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, FileText, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { formatGHS } from "@/lib/catalog-utils";
import { Constants } from "@/integrations/supabase/types";
import {
  allowedOrderTransitions,
  allowedQuoteTransitions,
  isOrderCancellable,
  isTerminalOrderStatus,
  isTerminalQuoteStatus,
} from "@/lib/commerce-status";
import { listAdminProducts } from "@/lib/catalog-ops";
import { useAdminOrders, useAdminQuotes, useAdminProfiles, type AdminOrder, type AdminQuote, type AdminProfile } from "@/lib/queries/admin";
import { updateOrderStatus, updateQuoteItemPrice, updateQuoteStatus, updateProfileApproval, cancelOrder } from "@/lib/admin-ops";
import { requireStaffAccess } from "@/lib/staff";
import { CatalogueManager } from "@/components/admin/CatalogueManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ORDER_STATUSES = Constants.public.Enums.order_status;
const QUOTE_STATUSES = Constants.public.Enums.quote_status;
const APPROVAL_STATUSES = Constants.public.Enums.approval_status;

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    try {
      const access = await requireStaffAccess();
      return { access };
    } catch {
      throw redirect({ to: "/account" });
    }
  },
  loader: ({ context }) => ({ access: context.access }),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "TLB Enterprise" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    return {
      meta: [
        { title: "Admin overview — TLB Enterprise" },
        { name: "description", content: "Internal overview of orders, quote requests and catalogue coverage." },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: "Admin overview — TLB Enterprise" },
        { property: "og:description", content: "Internal operations overview." },
      ],
    };
  },
  component: Admin,
});

function Admin() {
  const { user } = useAuth();
  const { access } = Route.useRouteContext();
  const orders = useAdminOrders(user?.id);
  const quotes = useAdminQuotes(user?.id);
  const profiles = useAdminProfiles(user?.id);
  const catalogue = useQuery({ queryKey: ["admin-catalogue"], queryFn: () => listAdminProducts() });
  const revenue = (orders.data ?? []).reduce((s, o) => s + Number(o.total), 0);

  const stats = [
    { icon: Box, label: "Orders visible", value: String(orders.data?.length ?? 0) },
    { icon: FileText, label: "Quote requests", value: String(quotes.data?.length ?? 0) },
    { icon: Users, label: "Order value", value: formatGHS(revenue) },
    { icon: Box, label: "Catalogue lines", value: String(catalogue.data?.length ?? 0) },
  ];

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-extrabold">Admin overview</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Operations shell for the TLB team. Order and quote lists are organisation-wide for admin and
        staff accounts, enforced by database row-level security.
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-md border border-border bg-primary-soft p-4 text-xs text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        <p>
          Order status, quoted prices, institutional approval, and catalogue edits run on the server.
          Approval changes and product restore are limited to the admin role. Stock quantity is not
          editable in this catalogue.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md border border-border bg-card p-5">
            <s.icon className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-3 font-display text-xl font-extrabold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="orders" className="mt-10">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-4">
          {orders.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading orders…</p>
          ) : orders.error ? (
            <p className="text-sm text-muted-foreground">Could not load orders. Please try again.</p>
          ) : (
            <OrderList orders={orders.data ?? []} />
          )}
        </TabsContent>
        <TabsContent value="quotes" className="mt-4">
          {quotes.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading quotes…</p>
          ) : quotes.error ? (
            <p className="text-sm text-muted-foreground">Could not load quotes. Please try again.</p>
          ) : (
            <QuoteList quotes={quotes.data ?? []} />
          )}
        </TabsContent>
        <TabsContent value="catalogue" className="mt-4">
          <CatalogueManager canRestore={access.isAdmin} />
        </TabsContent>
        <TabsContent value="accounts" className="mt-4">
          {profiles.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading accounts…</p>
          ) : profiles.error ? (
            <p className="text-sm text-muted-foreground">Could not load accounts. Please try again.</p>
          ) : (
            <ProfileList profiles={profiles.data ?? []} canApprove={access.isAdmin} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function mutationMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function OrderList({ orders }: { orders: AdminOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No records yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </div>
  );
}

function OrderRow({ order }: { order: AdminOrder }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const nextStatuses = allowedOrderTransitions(order.status);
  const terminal = isTerminalOrderStatus(order.status);
  const cancellable = isOrderCancellable(order.status);

  const saveStatus = async (status: (typeof ORDER_STATUSES)[number]) => {
    if (status === order.status) return;
    setBusy(true);
    try {
      await updateOrderStatus({ data: { orderId: order.id, status } });
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success(`Order ${order.reference} updated`);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not update order status"));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await cancelOrder({ data: { orderId: order.id } });
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success(`Order ${order.reference} cancelled`);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not cancel order"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
      <div>
        <p className="font-display font-bold">{order.reference}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(order.created_at).toLocaleString("en-GB")} · {order.shipping_name ?? "—"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {order.order_items.length} {order.order_items.length === 1 ? "line" : "lines"} ·{" "}
          {formatGHS(Number(order.total))}
        </span>
        {terminal ? (
          <span className="text-xs font-medium capitalize text-muted-foreground">
            {order.status.replaceAll("_", " ")} · closed
          </span>
        ) : (
          <Select
            value={order.status}
            onValueChange={(value) => void saveStatus(value as (typeof ORDER_STATUSES)[number])}
            disabled={busy || nextStatuses.length === 0}
          >
            <SelectTrigger className="h-8 w-44 text-xs" aria-label={`Status for ${order.reference}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={order.status} className="capitalize">
                {order.status.replaceAll("_", " ")}
              </SelectItem>
              {nextStatuses.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">
                  {status.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {cancellable ? (
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void cancel()}>
            Cancel order
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function QuoteList({ quotes }: { quotes: AdminQuote[] }) {
  if (quotes.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No records yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {quotes.map((quote) => (
        <QuoteRow key={quote.id} quote={quote} />
      ))}
    </div>
  );
}

function QuoteRow({ quote }: { quote: AdminQuote }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const nextStatuses = allowedQuoteTransitions(quote.status);
  const terminal = isTerminalQuoteStatus(quote.status);

  const saveStatus = async (status: (typeof QUOTE_STATUSES)[number]) => {
    if (status === quote.status) return;
    setBusy(true);
    try {
      await updateQuoteStatus({ data: { quoteId: quote.id, status } });
      await queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      toast.success(`Quote ${quote.reference} updated`);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not update quote status"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display font-bold">{quote.reference}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(quote.created_at).toLocaleString("en-GB")} · {quote.contact_name ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {quote.quote_items.length} {quote.quote_items.length === 1 ? "item" : "items"}
          </span>
          {terminal ? (
            <span className="text-xs font-medium capitalize text-muted-foreground">
              {quote.status} · closed
            </span>
          ) : (
            <Select
              value={quote.status}
              onValueChange={(value) => void saveStatus(value as (typeof QUOTE_STATUSES)[number])}
              disabled={busy || nextStatuses.length === 0}
            >
              <SelectTrigger className="h-8 w-40 text-xs" aria-label={`Status for ${quote.reference}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={quote.status} className="capitalize">
                  {quote.status}
                </SelectItem>
                {nextStatuses.map((status) => (
                  <SelectItem key={status} value={status} className="capitalize">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {quote.quote_items.map((item) => (
          <QuoteItemPriceRow key={item.id} item={item} quoteReference={quote.reference} />
        ))}
      </ul>
    </div>
  );
}

function QuoteItemPriceRow({
  item,
  quoteReference,
}: {
  item: AdminQuote["quote_items"][number];
  quoteReference: string;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(item.quoted_price == null ? "" : String(item.quoted_price));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const parsed = Number(value);
    setBusy(true);
    try {
      await updateQuoteItemPrice({ data: { quoteItemId: item.id, quotedPrice: parsed } });
      await queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      toast.success(`Price saved for ${quoteReference}`);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not update quoted price"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md bg-secondary/50 px-3 py-2 text-xs">
      <span className="min-w-0 flex-1 font-medium">{item.product_name}</span>
      <span className="text-muted-foreground">× {item.quantity}</span>
      {item.quoted_price != null ? (
        <Badge variant="secondary">{formatGHS(Number(item.quoted_price))}</Badge>
      ) : (
        <Badge variant="secondary">Pending</Badge>
      )}
      <Input
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        aria-label={`Quoted price for ${item.product_name}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-28"
      />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void save()}>
        Save price
      </Button>
    </li>
  );
}

function profileLabel(profile: AdminProfile) {
  return profile.full_name?.trim() || profile.institution_name?.trim() || "Unnamed account";
}

function ProfileList({ profiles, canApprove }: { profiles: AdminProfile[]; canApprove: boolean }) {
  if (profiles.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No records yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {profiles.map((profile) => (
        <ProfileRow key={profile.id} profile={profile} canApprove={canApprove} />
      ))}
    </div>
  );
}

function ProfileRow({ profile, canApprove }: { profile: AdminProfile; canApprove: boolean }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const label = profileLabel(profile);

  const saveStatus = async (approvalStatus: (typeof APPROVAL_STATUSES)[number]) => {
    if (approvalStatus === profile.approval_status) return;
    setBusy(true);
    try {
      await updateProfileApproval({ data: { profileId: profile.id, approvalStatus } });
      await queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success(`Account ${label} updated`);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not update approval status"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
      <div>
        <p className="font-display font-bold">{label}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(profile.created_at).toLocaleString("en-GB")} · {profile.account_type}
          {profile.institution_name ? ` · ${profile.institution_name}` : ""}
        </p>
      </div>
      <Select
        value={profile.approval_status}
        onValueChange={(value) => void saveStatus(value as (typeof APPROVAL_STATUSES)[number])}
        disabled={busy || !canApprove}
      >
        <SelectTrigger className="h-8 w-40 text-xs" aria-label={`Approval for ${label}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {APPROVAL_STATUSES.map((status) => (
            <SelectItem key={status} value={status} className="capitalize">
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
