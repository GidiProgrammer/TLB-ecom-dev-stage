import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatGHS, remainingPurchasableQty, stockLabel, stockStatus } from "@/lib/catalog-utils";
import { fetchProductBySlug, useProduct } from "@/lib/queries/products";
import { useStore, type LineItem } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { privatePageHead } from "@/lib/seo";

export const Route = createFileRoute("/cart")({
  head: () =>
    privatePageHead(
      "Your cart — TLB Enterprise",
      "Review the laboratory products in your cart before placing an order with TLB Enterprise.",
    ),
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

  if (error || !product) {
    const label = line.id.replace(/-/g, " ");
    return (
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm font-bold capitalize">{label}</p>
          <p className="mt-1 text-sm text-destructive" role="status">
            This product is no longer available and cannot be ordered.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => removeFromCart(line.id)}>
          Remove
        </Button>
      </div>
    );
  }

  const status = stockStatus(product.stock_quantity, product.low_stock_threshold);
  const overStock = product.stock_quantity > 0 && line.qty > product.stock_quantity;
  const unavailable = status === "out-of-stock";

  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row">
      <img
        src={product.image}
        alt={product.hasProductImage ? product.name : `Category illustration for ${product.name}`}
        className="h-20 w-20 shrink-0 rounded object-cover"
      />
      <div className="min-w-0 flex-1">
        <Link
          to="/product/$id"
          params={{ id: product.slug }}
          className="font-display text-sm font-bold hover:text-primary"
        >
          {product.name}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatGHS(product.price)}
          {product.unit ? ` / ${product.unit}` : ""}
          {" · "}
          {stockLabel(product.stock_quantity, product.low_stock_threshold)}
        </p>
        {unavailable ? (
          <p className="mt-2 text-sm text-destructive" role="status">
            Out of stock. Remove this item or return to the shop. Checkout is blocked until it is removed.
          </p>
        ) : null}
        {overStock ? (
          <p className="mt-2 text-sm text-destructive" role="status">
            Your quantity is higher than current stock. Reduce it before checkout. Stock can still change
            before the order is confirmed.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {unavailable ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/shop">Return to shop</Link>
            </Button>
          ) : (
            <Input
              type="number"
              min={1}
              max={product.stock_quantity}
              step={1}
              aria-label={`Quantity for ${product.name}`}
              value={line.qty}
              onChange={(e) => {
                const next = Math.floor(Number(e.target.value));
                if (!Number.isFinite(next) || next <= 0) {
                  setCartQty(line.id, 0);
                  return;
                }
                if (next > product.stock_quantity) {
                  toast.error("That quantity is more than current stock", {
                    description: `Reduce to ${product.stock_quantity} or fewer.`,
                  });
                  return;
                }
                setCartQty(line.id, next);
              }}
              className="w-20"
            />
          )}
          {overStock ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCartQty(line.id, product.stock_quantity)}
            >
              Reduce to available
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => removeFromCart(line.id)}>
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
        </div>
      </div>
      <p className="font-display text-sm font-bold sm:text-right">
        {unavailable ? "—" : formatGHS(product.price * line.qty)}
      </p>
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
  const linesLoading = lineQueries.some((q) => q.isLoading);
  const cartSubtotal = cart.reduce((sum, line, i) => {
    const product = lineQueries[i]?.data;
    if (!product || product.stock_quantity <= 0) return sum;
    return sum + product.price * line.qty;
  }, 0);
  const checkoutBlocked = cart.some((line, i) => {
    const product = lineQueries[i]?.data;
    if (!product) return true;
    if (product.stock_quantity <= 0) return true;
    if (line.qty > product.stock_quantity) return true;
    return remainingPurchasableQty(product.stock_quantity, 0) <= 0;
  });

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
            {checkoutBlocked && !linesLoading ? (
              <p className="mt-4 text-sm text-destructive" role="status">
                Fix unavailable items or quantities above current stock before checkout.
              </p>
            ) : null}
            {checkoutBlocked ? (
              <Button disabled className="mt-5 w-full">
                Proceed to checkout
              </Button>
            ) : (
              <Button asChild className="mt-5 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/checkout">Proceed to checkout</Link>
              </Button>
            )}
            <Button variant="ghost" className="mt-2 w-full" onClick={clearCart}>
              Clear cart
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              No online payment is taken. We confirm your order and arrange invoicing or purchase order
              settlement directly. Stock is confirmed when the order is placed.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
