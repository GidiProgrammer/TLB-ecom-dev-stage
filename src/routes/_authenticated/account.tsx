import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  accountTypeLabel,
  approvalPresentation,
  orderStatusLabel,
  quoteStatusLabel,
} from "@/lib/account-display";
import { formatGHS } from "@/lib/catalog-utils";
import { isQuoteCustomerAcceptable } from "@/lib/commerce-status";
import { acceptQuote } from "@/lib/quotes";
import {
  normalizeProfileUpdate,
  updateAccountProfile,
  useAccountOrders,
  useAccountProfile,
  useAccountQuotes,
  type AccountOrder,
  type AccountProfile,
  type AccountQuote,
} from "@/lib/queries/account";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account dashboard — TLB Enterprise" },
      { name: "description", content: "Track your laboratory orders, quotation requests and account status." },
      { property: "og:title", content: "Account dashboard — TLB Enterprise" },
      { property: "og:description", content: "Manage your TLB Enterprise laboratory supply account." },
    ],
  }),
  component: Account,
});

function Account() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useAccountProfile(user?.id);
  const orders = useAccountOrders(user?.id);
  const quotes = useAccountQuotes(user?.id);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Account dashboard</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/experiments">My experiments</Link>
          </Button>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </Button>
        </div>
      </div>

      <ProfileSection query={profile} userId={user?.id} />

      <Tabs defaultValue="orders" className="mt-10">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="quotes">Quote requests</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          {orders.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading orders…</p>
          ) : orders.error ? (
            <p className="text-sm text-muted-foreground">Could not load orders. Please try again.</p>
          ) : !orders.data?.length ? (
            <EmptyState label="No orders yet" cta="Browse products" to="/shop" />
          ) : (
            <div className="divide-y divide-border rounded-md border border-border">
              {orders.data.map((o) => (
                <OrderHistoryCard key={o.id} order={o} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          {quotes.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading quote requests…</p>
          ) : quotes.error ? (
            <p className="text-sm text-muted-foreground">Could not load quote requests. Please try again.</p>
          ) : !quotes.data?.length ? (
            <EmptyState label="No quote requests yet" cta="Request a quote" to="/quote" />
          ) : (
            <div className="divide-y divide-border rounded-md border border-border">
              {quotes.data.map((q) => (
                <QuoteHistoryCard key={q.id} quote={q} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileSection({
  query,
  userId,
}: {
  query: ReturnType<typeof useAccountProfile>;
  userId: string | undefined;
}) {
  if (query.isLoading) {
    return (
      <div className="mt-6 rounded-md border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Loading account details…</p>
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="mt-6 rounded-md border border-destructive/40 bg-card p-5">
        <p className="font-display text-sm font-bold">Could not load your account details</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your approval status is unavailable until this loads successfully.
        </p>
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="mt-6 rounded-md border border-border bg-card p-5">
        <p className="font-display text-sm font-bold">Account profile not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your sign-in works, but we could not find a profile record for this account. Contact us if this continues.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Account type</p>
          <p className="mt-1 font-display text-lg font-bold">{accountTypeLabel(query.data.account_type)}</p>
          {query.data.institution_name ? (
            <p className="text-xs text-muted-foreground">{query.data.institution_name}</p>
          ) : null}
        </div>
        <div className="rounded-md border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Account status</p>
          <div className="mt-2">
            <Badge
              className={
                query.data.approval_status === "approved"
                  ? "bg-success text-success-foreground"
                  : query.data.approval_status === "rejected"
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-accent text-accent-foreground"
              }
            >
              {approvalPresentation(query.data)}
            </Badge>
          </div>
        </div>
        <div className="rounded-md border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Contact</p>
          <p className="mt-1 text-sm font-medium">{query.data.full_name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{query.data.phone ?? "No phone on file"}</p>
        </div>
      </div>
      {userId ? <ProfileEditor profile={query.data} userId={userId} /> : null}
    </>
  );
}

function ProfileEditor({ profile, userId }: { profile: AccountProfile; userId: string }) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [institutionName, setInstitutionName] = useState(profile.institution_name ?? "");
  const [institutionType, setInstitutionType] = useState(profile.institution_type ?? "");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setInstitutionName(profile.institution_name ?? "");
    setInstitutionType(profile.institution_type ?? "");
  }, [profile]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const next = normalizeProfileUpdate({
      full_name: fullName,
      phone,
      institution_name: institutionName,
      institution_type: institutionType,
    });
    if ("error" in next) {
      setFormError(next.error);
      return;
    }
    setFormError(null);
    setBusy(true);
    try {
      const saved = await updateAccountProfile(userId, next);
      queryClient.setQueryData(["profile", userId], saved);
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Profile saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save your profile";
      setFormError(message);
      toast.error("Could not save your profile", { description: message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-6 rounded-md border border-border bg-card p-5">
      <h2 className="font-display text-base font-bold">Profile details</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Update the contact details we use for orders and quotations. Account type and status cannot be changed here.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="profile-full-name">Full name</Label>
          <Input
            id="profile-full-name"
            name="full_name"
            value={fullName}
            required
            maxLength={120}
            autoComplete="name"
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="profile-phone">Phone</Label>
          <Input
            id="profile-phone"
            name="phone"
            type="tel"
            value={phone}
            maxLength={40}
            autoComplete="tel"
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="profile-institution-name">Institution name</Label>
          <Input
            id="profile-institution-name"
            name="institution_name"
            value={institutionName}
            maxLength={160}
            onChange={(e) => setInstitutionName(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="profile-institution-type">Institution type</Label>
          <Input
            id="profile-institution-type"
            name="institution_type"
            value={institutionType}
            maxLength={80}
            placeholder="University, hospital, industry…"
            onChange={(e) => setInstitutionType(e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>
      {formError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}
      <Button type="submit" disabled={busy} className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
        {busy ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

function OrderHistoryCard({ order }: { order: AccountOrder }) {
  const shippingBits = [order.shipping_name, order.shipping_address, order.shipping_city].filter(Boolean);
  return (
    <article className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold">{order.reference}</h3>
          <p className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString("en-GB")} · {order.order_items.length}{" "}
            {order.order_items.length === 1 ? "line item" : "line items"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{orderStatusLabel(order.status)}</Badge>
          <span className="font-display text-sm font-bold text-primary">{formatGHS(Number(order.total))}</span>
        </div>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-primary">Order details</summary>
        <div className="mt-3 space-y-3 text-sm">
          {order.institution ? <p className="text-muted-foreground">Institution: {order.institution}</p> : null}
          {shippingBits.length ? (
            <p>
              <span className="font-medium">Delivery contact</span>
              <span className="mt-1 block text-muted-foreground">{shippingBits.join(", ")}</span>
              {order.shipping_phone ? (
                <span className="block text-muted-foreground">{order.shipping_phone}</span>
              ) : null}
              {order.shipping_email ? (
                <span className="block text-muted-foreground">{order.shipping_email}</span>
              ) : null}
            </p>
          ) : null}
          {order.order_items.length > 0 ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {order.order_items.map((item) => (
                <li key={item.id}>
                  {item.quantity} × {item.product_name} · {formatGHS(Number(item.unit_price))} ·{" "}
                  {formatGHS(Number(item.line_total))}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No line items on this order.</p>
          )}
        </div>
      </details>
    </article>
  );
}

function QuoteHistoryCard({ quote }: { quote: AccountQuote }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const hasQuotedPrice = quote.quote_items.some((item) => item.quoted_price != null);
  const contactBits = [quote.contact_name, quote.contact_email, quote.contact_phone].filter(Boolean);
  const canAccept = isQuoteCustomerAcceptable(quote.status);

  const accept = async () => {
    setBusy(true);
    try {
      await acceptQuote({ data: { quoteId: quote.id } });
      await queryClient.invalidateQueries({ queryKey: ["account-quotes"] });
      toast.success(`Quotation ${quote.reference} accepted`, {
        description: "This is not an order and no payment was taken.",
      });
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "Could not accept quotation";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold">{quote.reference}</h3>
          <p className="text-xs text-muted-foreground">
            {new Date(quote.created_at).toLocaleDateString("en-GB")} · {quote.quote_items.length}{" "}
            {quote.quote_items.length === 1 ? "item" : "items"}
          </p>
        </div>
        <Badge variant="secondary">{quoteStatusLabel(quote.status)}</Badge>
      </div>
      {canAccept ? (
        <div className="mt-3 space-y-2 rounded-md border border-border bg-secondary/40 p-3">
          <p className="text-xs text-muted-foreground">
            Accepting confirms that you agree to the quoted prices. It does not create an order or process
            payment.
          </p>
          <Button type="button" size="sm" disabled={busy} onClick={() => void accept()}>
            {busy ? "Accepting…" : "Accept quotation"}
          </Button>
        </div>
      ) : null}
      {quote.notes ? <p className="mt-2 text-xs text-muted-foreground">{quote.notes}</p> : null}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-primary">Quote details</summary>
        <div className="mt-3 space-y-3 text-sm">
          {quote.institution ? <p className="text-muted-foreground">Institution: {quote.institution}</p> : null}
          {contactBits.length ? (
            <p>
              <span className="font-medium">Contact</span>
              <span className="mt-1 block text-muted-foreground">{contactBits.join(" · ")}</span>
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Quoted amounts are estimates from our team. They are not an invoice and are not a checkout total.
          </p>
          {quote.quote_items.length > 0 ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {quote.quote_items.map((item) => (
                <li key={item.id}>
                  {item.quantity} × {item.product_name} ·{" "}
                  {item.quoted_price == null
                    ? "Price not yet provided"
                    : `${formatGHS(Number(item.quoted_price))} quoted unit price`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No items on this quote request.</p>
          )}
          {!hasQuotedPrice && quote.quote_items.length > 0 ? (
            <p className="text-xs text-muted-foreground">This request is waiting for quoted prices.</p>
          ) : null}
        </div>
      </details>
    </article>
  );
}

function EmptyState({ label, cta, to }: { label: string; cta: string; to: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-10 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to={to}>{cta}</Link>
      </Button>
    </div>
  );
}
