import { Link } from "@tanstack/react-router";
import { FileText, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { formatGHS, remainingPurchasableQty, stockLabel, unavailableReason, purchaseUnavailableLabel, purchaseUnavailableMessage } from "@/lib/catalog-utils";
import type { CatalogProduct } from "@/lib/queries/products";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProductCard({ product, className }: { product: CatalogProduct; className?: string }) {
  const { addToCart, addToQuote, cart } = useStore();
  const inCart = cart.find((line) => line.id === product.id)?.qty ?? 0;
  const remaining = remainingPurchasableQty(product.stock_quantity, inCart);
  const blocked = unavailableReason(product.stock_quantity, inCart);
  const canAdd = remaining > 0;

  const handleAddToCart = () => {
    if (!canAdd) {
      toast.error(blocked ? purchaseUnavailableMessage(blocked) : "This product is out of stock");
      return;
    }
    addToCart(product.id, 1);
    toast.success("Added to cart", { description: product.name });
  };

  return (
    <article className={cn("group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-card", className)}>
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block aspect-4/3 overflow-hidden bg-neutral-100"
      >
        <img
          src={product.image}
          alt={product.hasProductImage ? product.name : `Category illustration for ${product.name}`}
          loading="lazy"
          className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-3">
        {product.categoryName ? (
          <p className="line-clamp-1 text-xs font-semibold uppercase tracking-wide text-primary">
            {product.categoryName}
          </p>
        ) : null}
        <h3 className="mt-1 line-clamp-2 min-h-[2.75rem] font-display text-base font-semibold leading-snug tracking-tight text-foreground">
          <Link to="/product/$id" params={{ id: product.id }} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {stockLabel(product.stock_quantity, product.low_stock_threshold)}
        </p>

        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-display text-xl font-bold tracking-tight text-primary">{formatGHS(product.price)}</span>
          {product.unit ? <span className="text-sm text-muted-foreground">/ {product.unit}</span> : null}
        </div>

        <div className="mt-auto flex gap-2 pt-3">
          {canAdd ? (
            <Button
              size="sm"
              className="flex-1 bg-gold text-gold-foreground hover:bg-gold-hover"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4" /> Add
            </Button>
          ) : (
            <Button size="sm" className="flex-1" disabled>
              {blocked ? purchaseUnavailableLabel(blocked) : "Out of stock"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            aria-label="Add to quote request"
            onClick={() => {
              addToQuote(product.id);
              toast.success("Added to quote request", { description: product.name });
            }}
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}
