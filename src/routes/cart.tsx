import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { formatGHS, productImage } from "@/lib/catalog-utils";
import { fetchProductBySlug, useProduct } from "@/lib/queries/products";
import { useStore, type LineItem } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — TLB Enterprise" },
      { name: "description", content: "Review the laboratory products in your cart before placing an order with TLB Enterprise." },
      { property: "og:title", content: "Your cart — TLB Enterprise" },
      { property: "og:description", content: "Review your laboratory supply order before checkout." },
    ],
  }),
  component: CartPage,
});

function CartLine({
  line,
  setCartQty,
  removeFromCart,
}: {
  line: LineItem;
  setCartQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
}) {
  const { data: product, isLoading, error } = useProduct(line.id);

  if (isLoading) {
    return (
      <div className="flex gap-4 p-4">
        <Skeleton className="h-20 w-20 shrink-0 rounded" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    );
  }

  if (error || !product) return null;

  return (
    <div className="flex gap-4 p-4">
      <img
        src={productImage(product.category)}
        alt={product.name}
        className="h-20 w-20 shrink-0 rounded object-cover"
      />
      <div className="min-w-0 flex-1">
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          className="font-display text-sm font-bold hover:text-primary"
        >
          {product.name}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {product.brand} · {formatGHS(product.price)} / {product.unit}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Input
            type="number"
            min={1}
            aria-label={`Quantity for ${product.name}`}
            value={line.qty}
            onChange={(e) => setCartQty(line.id, Number(e.target.value) || 0)}
            className="w-20"
          />
          <Button variant="ghost" size="sm" onClick={() => removeFromCart(line.id)}>
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
        </div>
      </div>
      <p className="font-display text-sm font-bold">{formatGHS(product.price * line.qty)}</p>
    </div>
  );
}

function CartPage() {
  const { cart, setCartQty, removeFromCart, clearCart } = useStore();
  const lineQueries = useQueries({
    queries: cart.map((line) => ({
      queryKey: ["product", line.id],
      queryFn: () => fetchProductBySlug(line.id),
      enabled: Boolean(line.id),
    })),
  });
  const cartSubtotal = cart.reduce((sum, line, i) => {
    const product = lineQueries[i]?.data;
    return sum + (product ? product.price * line.qty : 0);
  }, 0);

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-extrabold">Your cart</h1>

      {cart.length === 0 ? (
        <div className="mt-8 rounded-md border border-dashed border-border p-12 text-center">
          <p className="font-display text-lg font-bold">Your cart is empty</p>
          <p className="mt-2 text-sm text-muted-foreground">Browse the catalogue to add laboratory supplies.</p>
          <Button asChild className="mt-5 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/shop">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="divide-y divide-border rounded-md border border-border">
            {cart.map((line) => (
              <CartLine
                key={line.id}
                line={line}
                setCartQty={setCartQty}
                removeFromCart={removeFromCart}
              />
            ))}
          </div>

          <aside className="h-fit rounded-md border border-border bg-card p-5">
            <h2 className="font-display text-base font-bold">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium">{formatGHS(cartSubtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="text-muted-foreground">Quoted separately</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 font-display text-base font-extrabold">
                <dt>Total</dt>
                <dd className="text-primary">{formatGHS(cartSubtotal)}</dd>
              </div>
            </dl>
            <Button asChild className="mt-5 w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/checkout">Proceed to checkout</Link>
            </Button>
            <Button variant="ghost" className="mt-2 w-full" onClick={clearCart}>
              Clear cart
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              No online payment is taken. We confirm your order and arrange invoicing or purchase order
              settlement directly.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
