import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { formatGHS } from "@/lib/catalog-utils";
import { fetchProductBySlug, useProduct } from "@/lib/queries/products";
import { useStore, type LineItem } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { commerceConfirmationPath, parseOrderReference } from "@/lib/commerce-confirmation";
import { createOrder } from "@/lib/orders";
import { clearSubmissionNonce, getOrCreateSubmissionNonce } from "@/lib/commerce-nonce";
import { clearFormDraft } from "@/lib/form-draft";
import { usePreservedContactForm } from "@/lib/use-contact-draft";
import { useAccountProfile } from "@/lib/queries/account";
import { privatePageHead } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/checkout/")({
  head: () =>
    privatePageHead(
      "Checkout — TLB Enterprise",
      "Confirm your laboratory supply order. Invoicing and purchase orders are arranged offline.",
    ),
  component: Checkout,
});

const CHECKOUT_DRAFT = "checkout";

function CheckoutLine({ line, onRemove }: { line: LineItem; onRemove: (id: string) => void }) {
  const { data: product, isLoading, error } = useProduct(line.id);
  if (isLoading) {
    return (
      <li className="flex justify-between gap-3 text-muted-foreground">
        <span>Loading…</span>
      </li>
    );
  }
  if (error || !product) {
    const label = line.id.replace(/-/g, " ");
    return (
      <li className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium capitalize">{label}</p>
          <p className="text-sm text-destructive" role="status">
            This product is no longer available. Remove it before placing the order.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onRemove(line.id)}>
          Remove
        </Button>
      </li>
    );
  }
  return (
    <li className="flex justify-between gap-3">
      <span className="text-muted-foreground">
        {line.qty} × {product.name}
      </span>
      <span>{formatGHS(product.price * line.qty)}</span>
    </li>
  );
}

function Checkout() {
  const { cart, clearCart, removeFromCart } = useStore();
  const { user, loading: authLoading } = useAuth();
  const profile = useAccountProfile(user?.id);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const lineQueries = useQueries({
    queries: cart.map((line) => ({
      queryKey: ["product", line.id],
      queryFn: () => fetchProductBySlug(line.id),
      enabled: Boolean(line.id),
    })),
  });
  const [form, setForm] = usePreservedContactForm(
    CHECKOUT_DRAFT,
    {
      name: "",
      email: "",
      phone: "",
      institution: "",
      address: "",
      city: "",
      notes: "",
    },
    {
      authLoading,
      profile: profile.data,
      profileLoading: Boolean(user?.id) && profile.isLoading,
      email: user?.email,
    },
  );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const items = cart
    .map((l, i) => {
      const p = lineQueries[i]?.data;
      return p ? { id: p.id, name: p.name, qty: l.qty, price: p.price, unit: p.unit } : null;
    })
    .filter(Boolean);
  const cartSubtotal = items.reduce((sum, i) => sum + (i ? i.price * i.qty : 0), 0);
  const linesLoading = lineQueries.some((q) => q.isLoading);
  const linesMissing = cart.some((_, i) => {
    const query = lineQueries[i];
    return !query || (!query.isLoading && !query.data);
  });
  const linesUnavailable = cart.some((line, i) => {
    const p = lineQueries[i]?.data;
    if (!p) return false;
    return p.stock_quantity <= 0 || line.qty > p.stock_quantity;
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to place an order");
      navigate({ to: "/auth", search: { redirect: "/checkout" } });
      return;
    }
    setBusy(true);
    setSubmitError(null);
    const submissionNonce = getOrCreateSubmissionNonce("order");
    try {
      const orderItems = cart.flatMap((l, i) => {
        const p = lineQueries[i]?.data;
        return p ? [{ product_id: p.productId, quantity: l.qty }] : [];
      });
      if (orderItems.length !== cart.length) {
        throw new Error("Some products in your cart could not be loaded. Please refresh and try again.");
      }

      const { reference } = await createOrder({
        data: {
          userId: user.id,
          submissionNonce,
          institution: form.institution.trim() ? form.institution.trim() : null,
          shipping: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            address: form.address,
            city: form.city,
            notes: form.notes || undefined,
          },
          items: orderItems,
        },
      });

      const parsed = parseOrderReference(reference);
      const confirmation = parsed ? commerceConfirmationPath("order", parsed) : null;
      if (!parsed || !confirmation) {
        throw new Error("Order was created but the confirmation link could not be opened. Check your account.");
      }
      clearSubmissionNonce("order");
      clearFormDraft(CHECKOUT_DRAFT);
      clearCart();
      toast.success("Order received", { description: "Our team will confirm pricing and delivery." });
      await navigate({ to: "/checkout/confirmed", search: { ref: parsed } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not place order";
      setSubmitError(message);
      toast.error("Could not place order", { description: message });
    } finally {
      setBusy(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Nothing to check out</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add products to your cart first.</p>
        <Button asChild className="mt-6">
          <Link to="/shop">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        No payment is taken online. Submit your order and we will confirm availability, delivery cost and
        invoicing terms.
      </p>
      {!user ? (
        <div className="mt-6 rounded-md border border-border bg-primary-soft px-4 py-3 text-sm">
          <p className="font-semibold">Sign in to complete your order.</p>
          <p className="mt-1 text-muted-foreground">Your cart and delivery details stay on this device until you return.</p>
          <Button asChild size="sm" className="mt-3">
            <Link to="/auth" search={{ redirect: "/checkout" }}>
              Sign in
            </Link>
          </Button>
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5 rounded-md border border-border p-6">
          {submitError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <p className="font-semibold">Your order was not placed</p>
              <p className="mt-1">{submitError}</p>
              <p className="mt-1 text-destructive/80">Your cart and form details have been kept. You can correct the issue and try again.</p>
            </div>
          )}
          {linesMissing ? (
            <div role="status" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              A product in your order is no longer available. Remove it before placing the order.
            </div>
          ) : null}
          {linesUnavailable ? (
            <div role="status" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              One or more items are out of stock or exceed current stock. Return to your cart to update quantities.
            </div>
          ) : null}
          <h2 className="font-display text-base font-bold">Delivery details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Contact name</Label>
              <Input id="name" autoComplete="name" required value={form.name} onChange={set("name")} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" autoComplete="tel" required value={form.phone} onChange={set("phone")} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="institution">Institution / company</Label>
              <Input id="institution" autoComplete="organization" value={form.institution} onChange={set("institution")} className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">Delivery address</Label>
              <Input id="address" autoComplete="street-address" required value={form.address} onChange={set("address")} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="city">City / town</Label>
              <Input id="city" autoComplete="address-level2" required value={form.city} onChange={set("city")} className="mt-1.5" />
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
            {cart.map((line) => (
              <CheckoutLine key={line.id} line={line} onRemove={removeFromCart} />
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-border pt-3 text-base font-semibold">
            <span>Total</span>
            <span className="text-primary">{formatGHS(cartSubtotal)}</span>
          </div>
          <Button
            type="submit"
            disabled={!user || busy || linesLoading || linesMissing || linesUnavailable}
            className="mt-5 w-full bg-gold text-gold-foreground hover:bg-gold-hover"
          >
            {busy ? "Submitting…" : "Place order"}
          </Button>
          {!user && (
            <p className="mt-3 text-xs text-muted-foreground">
              You&apos;ll need to{" "}
              <Link to="/auth" search={{ redirect: "/checkout" }} className="font-semibold text-primary hover:underline">
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
