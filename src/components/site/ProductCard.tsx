import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileText, Heart, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { formatGHS, remainingPurchasableQty, stockLabel, stockStatus, unavailableReason, purchaseUnavailableLabel, purchaseUnavailableMessage } from "@/lib/catalog-utils";
import type { CatalogProduct } from "@/lib/queries/products";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function cardSpec(description: string) {
  const text = description.replace(/\s+/g, " ").trim();
  if (!text || text.length > 36) return null;
  return text;
}

export function ProductCard({
  product,
  badge,
  showSave,
  className,
}: {
  product: CatalogProduct;
  badge?: string;
  showSave?: boolean;
  className?: string;
}) {
  const { addToCart, addToQuote, cart } = useStore();
  const inCart = cart.find((line) => line.id === product.id)?.qty ?? 0;
  const remaining = remainingPurchasableQty(product.stock_quantity, inCart);
  const blocked = unavailableReason(product.stock_quantity, inCart);
  const canAdd = remaining > 0;
  const spec = cardSpec(product.description);
  const [saved, setSaved] = useState(false);
  const status = stockStatus(product.stock_quantity, product.low_stock_threshold);
  const stockDot =
    status === "in-stock" ? "bg-success" : status === "low-stock" ? "bg-warning" : "bg-destructive";

  const handleAddToCart = () => {
    if (!canAdd) {
      toast.error(blocked ? purchaseUnavailableMessage(blocked) : "This product is out of stock");
      return;
    }
    addToCart(product.id, 1);
    toast.success("Added to cart", { description: product.name });
  };

  return (
    <article className={cn("group flex flex-col overflow-hidden rounded-card bg-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md", className)}>
      <div className="relative">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block aspect-[4/3] overflow-hidden bg-[#f5f4f6]"
      >
        {badge ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
            {badge}
          </span>
        ) : null}
        <img
          src={product.image}
          alt={product.hasProductImage ? product.name : `Category illustration for ${product.name}`}
          loading="lazy"
          className="h-full w-full object-cover object-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]"
        />
      </Link>
      {showSave ? (
        <button
          type="button"
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/95 text-neutral-600 shadow-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-pressed={saved}
          aria-label={saved ? "Remove saved product" : "Save product"}
          onClick={() => setSaved((current) => !current)}
        >
          <Heart className={cn("h-4 w-4", saved && "fill-primary text-primary")} aria-hidden />
        </button>
      ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {product.categoryName ? (
          <p className="line-clamp-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
            {product.categoryName}
          </p>
        ) : null}
        <h3 className="mt-1 line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug text-foreground">
          <Link to="/product/$id" params={{ id: product.id }} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>
        {spec ? <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{spec}</p> : null}
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", stockDot)} aria-hidden />
          {stockLabel(product.stock_quantity, product.low_stock_threshold)}
        </p>

        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-lg font-bold text-primary">{formatGHS(product.price)}</span>
          {product.unit ? <span className="text-sm text-muted-foreground">/ {product.unit}</span> : null}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-4">
          {canAdd ? (
            <Button
              size="sm"
              className="h-11 flex-1 bg-gold text-gold-foreground hover:bg-gold-hover"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4" /> Add to cart
            </Button>
          ) : (
            <Button size="sm" className="h-11 flex-1" disabled>
              {blocked ? purchaseUnavailableLabel(blocked) : "Out of stock"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-11 w-11 shrink-0 rounded-full border-border bg-white px-0 text-foreground hover:bg-neutral-50"
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
