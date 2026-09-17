import { createFileRoute, Link, Outlet, useChildMatches, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { accountTypeLabel, approvalPresentation } from "@/lib/account-display";
import {
  normalizeProfileUpdate,
  updateAccountProfile,
  useAccountOrders,
  useAccountProfile,
  useAccountQuotes,
  type AccountProfile,
} from "@/lib/queries/account";
import { AccountOrderCard } from "@/components/site/AccountOrderCard";
import { AccountQuoteCard } from "@/components/site/AccountQuoteCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { privatePageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/account")({
  validateSearch: (search: Record<string, unknown>): { tab?: "orders" | "quotes"; ref?: string } => {
    const parsed: { tab?: "orders" | "quotes"; ref?: string } = {};
    if (search["tab"] === "quotes" || search["tab"] === "orders") parsed.tab = search["tab"];
    if (typeof search["ref"] === "string" && search["ref"].length <= 80) parsed.ref = search["ref"];
    return parsed;
  },
  head: () =>
    privatePageHead(
      "Account dashboard — TLB Enterprise",
      "Track your laboratory orders, quotation requests and account status.",
    ),
  component: Account,
});

function Account() {
  const childMatches = useChildMatches();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const profile = useAccountProfile(user?.id);
  const orders = useAccountOrders(user?.id);
  const quotes = useAccountQuotes(user?.id);
  const tab = search.tab ?? "orders";

  if (childMatches.length > 0) {
    return <Outlet />;
  }

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="container-page min-w-0 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Account dashboard</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/account/notifications">Notifications</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/experiments">My experiments</Link>
          </Button>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </Button>
        </div>
      </div>

      <ProfileSection query={profile} userId={user?.id} />

      <Tabs
        value={tab}
        onValueChange={(value) => {
          const next: { tab: "orders" | "quotes"; ref?: string } = {
            tab: value === "quotes" ? "quotes" : "orders",
          };
          if (search.ref) next.ref = search.ref;
          navigate({ to: "/account", search: next });
        }}
        className="mt-10"
      >
        <TabsList className="flex h-auto min-h-11 w-full flex-wrap justify-start">
          <TabsTrigger value="orders" className="min-h-11 px-4">
            Orders
          </TabsTrigger>
          <TabsTrigger value="quotes" className="min-h-11 px-4">
            Quote requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <HistoryPanel
            kind="orders"
            refValue={tab === "orders" ? search.ref : undefined}
            isLoading={orders.isLoading}
            isError={Boolean(orders.error)}
            onRetry={() => {
              void orders.refetch();
            }}
            emptyLabel="No orders yet"
            emptyCta="Browse products"
            emptyTo="/shop"
            loadingLabel="Loading orders…"
            errorLabel="Could not load orders. Please try again."
            references={(orders.data ?? []).map((item) => item.reference)}
          >
            {(orders.data ?? []).map((o) => (
              <AccountOrderCard key={o.id} order={o} highlighted={search.ref === o.reference} />
            ))}
          </HistoryPanel>
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <HistoryPanel
            kind="quotes"
            refValue={tab === "quotes" ? search.ref : undefined}
            isLoading={quotes.isLoading}
            isError={Boolean(quotes.error)}
            onRetry={() => {
              void quotes.refetch();
            }}
            emptyLabel="No quote requests yet"
            emptyCta="Request a quote"
            emptyTo="/quote"
            loadingLabel="Loading quote requests…"
            errorLabel="Could not load quote requests. Please try again."
            references={(quotes.data ?? []).map((item) => item.reference)}
          >
            {(quotes.data ?? []).map((q) => (
              <AccountQuoteCard key={q.id} quote={q} highlighted={search.ref === q.reference} />
            ))}
          </HistoryPanel>
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
      <h2 className="text-base font-semibold">Profile details</h2>
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
      <Button type="submit" disabled={busy} className="mt-4">
        {busy ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

function HistoryPanel({
  kind,
  refValue,
  isLoading,
  isError,
  onRetry,
  emptyLabel,
  emptyCta,
  emptyTo,
  loadingLabel,
  errorLabel,
  references,
  children,
}: {
  kind: "orders" | "quotes";
  refValue?: string | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyLabel: string;
  emptyCta: string;
  emptyTo: string;
  loadingLabel: string;
  errorLabel: string;
  references: string[];
  children: ReactNode;
}) {
  const matched = Boolean(refValue && references.includes(refValue));
  const missingRef = Boolean(refValue && !isLoading && !isError && !matched);

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-live="polite">
        <p className="sr-only">{loadingLabel}</p>
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-card p-5" role="alert">
        <p className="text-sm text-destructive">{errorLabel}</p>
        <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (!references.length && !missingRef) {
    return <EmptyState label={emptyLabel} cta={emptyCta} to={emptyTo} />;
  }

  return (
    <div>
      {missingRef ? (
        <p className="mb-3 text-sm text-muted-foreground" role="status">
          That reference wasn't found in your account history.
        </p>
      ) : null}
      {matched && refValue ? (
        <p className="sr-only" aria-live="polite">
          Showing {kind === "orders" ? "order" : "quote request"} {refValue}
        </p>
      ) : null}
      <div className="divide-y divide-border rounded-lg border border-border">{children}</div>
    </div>
  );
}

function EmptyState({ label, cta, to }: { label: string; cta: string; to: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to={to}>{cta}</Link>
      </Button>
    </div>
  );
}
