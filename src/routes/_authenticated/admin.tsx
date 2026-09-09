import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Box, FileText, ShieldAlert, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatGHS } from "@/lib/catalog-utils";
import { useProducts } from "@/lib/queries/products";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin overview — TLB Enterprise" },
      { name: "description", content: "Internal overview of orders, quote requests and catalogue coverage." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin overview — TLB Enterprise" },
      { property: "og:description", content: "Internal operations overview." },
    ],
  }),
  component: Admin,
});

type Item = { id: string; name: string; qty: number };

function Admin() {
  const { user } = useAuth();

  const orders = useQuery({
    queryKey: ["admin-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const quotes = useQuery({
    queryKey: ["admin-quotes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useProducts();
  const revenue = (orders.data ?? []).reduce((s, o) => s + Number(o.total), 0);

  const stats = [
    { icon: Box, label: "Orders visible", value: String(orders.data?.length ?? 0) },
    { icon: FileText, label: "Quote requests", value: String(quotes.data?.length ?? 0) },
    { icon: Users, label: "Order value", value: formatGHS(revenue) },
    { icon: Box, label: "Catalogue lines", value: String(products?.length ?? 0) },
  ];

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-extrabold">Admin overview</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Operations shell for the TLB team. Records shown here respect account-level access rules — a
        staff role with organisation-wide visibility can be layered on when you're ready.
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-md border border-border bg-primary-soft p-4 text-xs text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p>
          This shell currently shows only records your own account can read. Approving institutional
          accounts and viewing every customer's orders requires a dedicated staff role — tell us when you
          want that enabled.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md border border-border bg-card p-5">
            <s.icon className="h-4 w-4 text-primary" />
            <p className="mt-3 font-display text-xl font-extrabold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="orders" className="mt-10">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-4">
          <RecordList
            rows={(orders.data ?? []).map((o) => ({
              id: o.id,
              reference: o.reference,
              status: o.status,
              created: o.created_at,
              meta: `${(o.items as unknown as Item[]).length} lines · ${formatGHS(Number(o.total))}`,
              contact: o.shipping_name ?? "—",
            }))}
          />
        </TabsContent>
        <TabsContent value="quotes" className="mt-4">
          <RecordList
            rows={(quotes.data ?? []).map((q) => ({
              id: q.id,
              reference: q.reference,
              status: q.status,
              created: q.created_at,
              meta: `${(q.items as unknown as Item[]).length} items`,
              contact: q.contact_name ?? "—",
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecordList({
  rows,
}: {
  rows: { id: string; reference: string; status: string; created: string; meta: string; contact: string }[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No records yet.
      </div>
    );
  }
  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {rows.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div>
            <p className="font-display font-bold">{r.reference}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(r.created).toLocaleString("en-GB")} · {r.contact}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{r.meta}</span>
            <Badge variant="secondary" className="capitalize">{r.status}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
