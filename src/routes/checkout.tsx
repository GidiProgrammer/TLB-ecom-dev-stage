import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { formatGHS, productById } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — TLB Enterprise" },
      { name: "description", content: "Confirm your laboratory supply order. Invoicing and purchase orders are arranged offline." },
      { property: "og:title", content: "Checkout — TLB Enterprise" },
      { property: "og:description", content: "Confirm delivery details for your laboratory supply order." },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { cart, cartSubtotal, clearCart } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: user?.email ?? "",
    phone: "",
    institution: "",
    address: "",
    city: "",
    notes: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const items = cart
    .map((l) => {
      const p = productById(l.id);
      return p ? { id: p.id, name: p.name, qty: l.qty, price: p.price, unit: p.unit } : null;
    })
    .filter(Boolean);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to place an order");
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    const reference = `TLB-${Date.now().toString().slice(-8)}`;
    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      reference,
      status: "pending",
      subtotal: cartSubtotal,
      total: cartSubtotal,
      shipping_name: form.name,
      shipping_email: form.email,
      shipping_phone: form.phone,
      shipping_address: `${form.address}${form.notes ? ` — ${form.notes}` : ""}`,
      shipping_city: form.city,
      institution: form.institution || null,
      items: items as unknown as never,
    });
    setBusy(false);
    if (error) {
      toast.error("Could not place order", { description: error.message });
      return;
    }
    clearCart();
    toast.success(`Order ${reference} received`, { description: "Our team will confirm pricing and delivery." });
    navigate({ to: "/account" });
  };

  if (cart.length === 0) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="font-display text-2xl font-extrabold">Nothing to check out</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add products to your cart first.</p>
        <Button asChild className="mt-6">
          <Link to="/shop">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-extrabold">Checkout</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        No payment is taken online. Submit your order and we will confirm availability, delivery cost and
        invoicing terms.
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5 rounded-md border border-border p-6">
          <h2 className="font-display text-base font-bold">Delivery details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Contact name</Label>
              <Input id="name" required value={form.name} onChange={set("name")} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={set("email")} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" required value={form.phone} onChange={set("phone")} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="institution">Institution / company</Label>
              <Input id="institution" value={form.institution} onChange={set("institution")} className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">Delivery address</Label>
              <Input id="address" required value={form.address} onChange={set("address")} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="city">City / town</Label>
              <Input id="city" required value={form.city} onChange={set("city")} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Order notes</Label>
            <Textarea id="notes" rows={3} value={form.notes} onChange={set("notes")} className="mt-1.5" />
          </div>
        </div>

        <aside className="h-fit rounded-md border border-border bg-card p-5">
          <h2 className="font-display text-base font-bold">Your order</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {items.map((i) => (
              <li key={i!.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {i!.qty} × {i!.name}
                </span>
                <span>{formatGHS(i!.price * i!.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-border pt-3 font-display text-base font-extrabold">
            <span>Total</span>
            <span className="text-primary">{formatGHS(cartSubtotal)}</span>
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="mt-5 w-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {busy ? "Submitting…" : "Place order"}
          </Button>
          {!user && (
            <p className="mt-3 text-xs text-muted-foreground">
              You'll need to{" "}
              <Link to="/auth" className="font-semibold text-primary hover:underline">
                sign in
              </Link>{" "}
              to submit an order.
            </p>
          )}
        </aside>
      </form>
    </div>
  );
}
