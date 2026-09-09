import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatGHS, productById } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/quote")({
  head: () => ({
    meta: [
      { title: "Request a quote — TLB Enterprise" },
      {
        name: "description",
        content:
          "Build a list of laboratory products and request formal institutional pricing from TLB Enterprise in Accra.",
      },
      { property: "og:title", content: "Request a quote — TLB Enterprise" },
      { property: "og:description", content: "Formal quotations for tenders, purchase orders and call-off supply." },
    ],
  }),
  component: QuotePage,
});

function QuotePage() {
  const { quote, setQuoteQty, removeFromQuote, clearQuote } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: user?.email ?? "",
    phone: "",
    institution: "",
    notes: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quote.length === 0) {
      toast.error("Add at least one product to your quote request");
      return;
    }
    if (!user) {
      toast.error("Please sign in to submit a quote request");
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    const reference = `QT-${Date.now().toString().slice(-8)}`;
    const items = quote.map((l) => {
      const p = productById(l.id);
      return { id: l.id, name: p?.name ?? l.id, qty: l.qty, price: p?.price ?? 0, unit: p?.unit ?? "" };
    });
    const { error } = await supabase.from("quotes").insert({
      user_id: user.id,
      reference,
      status: "submitted",
      notes: form.notes,
      contact_name: form.name,
      contact_email: form.email,
      contact_phone: form.phone,
      institution: form.institution || null,
      items: items as unknown as never,
    });
    setBusy(false);
    if (error) {
      toast.error("Could not submit request", { description: error.message });
      return;
    }
    clearQuote();
    toast.success(`Quote request ${reference} submitted`, { description: "We typically respond within one working day." });
    navigate({ to: "/account" });
  };

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-extrabold">Request a quote</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Ideal for tenders, purchase orders and bulk or call-off supply. Add the products you need, tell us
        the quantities, and we'll return formal institutional pricing with lead times.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          <h2 className="font-display text-base font-bold">Items requested</h2>
          {quote.length === 0 ? (
            <div className="mt-3 rounded-md border border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Your quote list is empty. Add items from the catalogue using the quote button on any product.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link to="/shop">Browse products</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-3 divide-y divide-border rounded-md border border-border">
              {quote.map((line) => {
                const p = productById(line.id);
                if (!p) return null;
                return (
                  <div key={line.id} className="flex items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <Link to="/product/$id" params={{ id: p.id }} className="font-display text-sm font-bold hover:text-primary">
                        {p.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.brand} · list {formatGHS(p.price)} / {p.unit}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      aria-label={`Quantity for ${p.name}`}
                      value={line.qty}
                      onChange={(e) => setQuoteQty(line.id, Number(e.target.value) || 0)}
                      className="w-20"
                    />
                    <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => removeFromQuote(line.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {quote.length > 0 && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={clearQuote}>
              Clear list
            </Button>
          )}
        </div>

        <form onSubmit={submit} className="h-fit space-y-4 rounded-md border border-border bg-card p-5">
          <h2 className="font-display text-base font-bold">Your details</h2>
          <div>
            <Label htmlFor="q-name">Contact name</Label>
            <Input id="q-name" required value={form.name} onChange={set("name")} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="q-email">Email</Label>
            <Input id="q-email" type="email" required value={form.email} onChange={set("email")} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="q-phone">Phone</Label>
            <Input id="q-phone" required value={form.phone} onChange={set("phone")} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="q-inst">Institution / company</Label>
            <Input id="q-inst" value={form.institution} onChange={set("institution")} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="q-notes">Notes</Label>
            <Textarea
              id="q-notes"
              rows={4}
              placeholder="Delivery deadline, tender reference, packaging requirements…"
              value={form.notes}
              onChange={set("notes")}
              className="mt-1.5"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {busy ? "Submitting…" : "Submit quote request"}
          </Button>
          {!user && (
            <p className="text-xs text-muted-foreground">
              <Link to="/auth" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>{" "}
              to submit and track your quote requests.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
