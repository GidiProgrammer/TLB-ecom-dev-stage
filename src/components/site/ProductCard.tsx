import { Link } from "@tanstack/react-router";
import { FileText, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { formatGHS, remainingPurchasableQty, stockLabel, stockStatus } from "@/lib/catalog-utils";
import type { CatalogProduct } from "@/lib/queries/products";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const { addToCart, addToQuote, cart } = useStore();
  const status = stockStatus(product.stock_quantity, product.low_stock_threshold);
  const inCart = cart.find((line) => line.id === product.id)?.qty ?? 0;
  const remaining = remainingPurchasableQty(product.stock_quantity, inCart);
  const canAdd = remaining > 0;

  const handleAddToCart = () => {
    if (!canAdd) {
      toast.error(status === "out-of-stock" ? "This product is out of stock" : "No more of this item can be added");
      return;
    }
    addToCart(product.id, 1);
    toast.success("Added to cart", { description: product.name });
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-md border border-border bg-card transition-shadow hover:shadow-card">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block aspect-4/3 overflow-hidden bg-secondary"
      >
        <img
          src={product.image}
          alt={product.hasProductImage ? product.name : `Category illustration for ${product.name}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {!product.hasProductImage ? (
          <span className="absolute bottom-2 left-2 rounded bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Category illustration
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {product.categoryName ? (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {product.categoryName}
          </p>
        ) : null}
        <h3 className="mt-1 line-clamp-2 font-display text-sm font-bold leading-snug">
          <Link to="/product/$id" params={{ id: product.id }} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">
          {stockLabel(product.stock_quantity, product.low_stock_threshold)}
        </p>

        <div className="mt-3 flex items-baseline gap-1">
          <span className="font-display text-lg font-extrabold text-primary">{formatGHS(product.price)}</span>
          {product.unit ? <span className="text-xs text-muted-foreground">/ {product.unit}</span> : null}
        </div>

        <div className="mt-4 flex gap-2">
          {canAdd ? (
            <Button
              size="sm"
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4" /> Add
            </Button>
          ) : (
            <Button size="sm" className="flex-1" disabled>
              {status === "out-of-stock" ? "Out of stock" : "None available"}
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
