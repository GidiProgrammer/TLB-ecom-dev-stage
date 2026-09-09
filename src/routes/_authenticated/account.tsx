import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatGHS } from "@/lib/catalog-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type Item = { id: string; name: string; qty: number; price: number };

function Account() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const orders = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const quotes = useQuery({
    queryKey: ["quotes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  const p = profile.data;

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
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Account type</p>
          <p className="mt-1 font-display text-lg font-bold capitalize">{p?.account_type ?? "—"}</p>
          {p?.institution_name && <p className="text-xs text-muted-foreground">{p.institution_name}</p>}
        </div>
        <div className="rounded-md border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Approval status</p>
          <div className="mt-2">
            <Badge
              className={
                p?.approval_status === "approved"
                  ? "bg-success text-success-foreground"
                  : p?.approval_status === "rejected"
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-accent text-accent-foreground"
              }
            >
              {p?.approval_status ?? "pending"}
            </Badge>
          </div>
        </div>
        <div className="rounded-md border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Contact</p>
          <p className="mt-1 text-sm font-medium">{p?.full_name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{p?.phone ?? "No phone on file"}</p>
        </div>
      </div>

      <Tabs defaultValue="orders" className="mt-10">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="quotes">Quote requests</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          {orders.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading orders…</p>
          ) : !orders.data?.length ? (
            <EmptyState label="No orders yet" cta="Browse products" to="/shop" />
          ) : (
            <div className="divide-y divide-border rounded-md border border-border">
              {orders.data.map((o) => (
                <div key={o.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-display text-sm font-bold">{o.reference}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("en-GB")} · {(o.items as unknown as Item[]).length} line items
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="capitalize">{o.status}</Badge>
                      <span className="font-display text-sm font-bold text-primary">{formatGHS(Number(o.total))}</span>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {(o.items as unknown as Item[]).map((i) => (
                      <li key={i.id}>{i.qty} × {i.name}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          {quotes.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading quote requests…</p>
          ) : !quotes.data?.length ? (
            <EmptyState label="No quote requests yet" cta="Request a quote" to="/quote" />
          ) : (
            <div className="divide-y divide-border rounded-md border border-border">
              {quotes.data.map((q) => (
                <div key={q.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-display text-sm font-bold">{q.reference}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(q.created_at).toLocaleDateString("en-GB")} · {(q.items as unknown as Item[]).length} items
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize">{q.status}</Badge>
                  </div>
                  {q.notes && <p className="mt-2 text-xs text-muted-foreground">{q.notes}</p>}
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {(q.items as unknown as Item[]).map((i) => (
                      <li key={i.id}>{i.qty} × {i.name}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
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
