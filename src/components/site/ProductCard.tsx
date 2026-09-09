import { Link } from "@tanstack/react-router";
import { FileText, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { formatGHS, productImage, stockLabel } from "@/lib/catalog-utils";
import type { CatalogProduct } from "@/lib/queries/products";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const { addToCart, addToQuote } = useStore();

  return (
    <article className="group flex flex-col overflow-hidden rounded-md border border-border bg-card transition-shadow hover:shadow-card">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block aspect-4/3 overflow-hidden bg-secondary"
      >
        <img
          src={productImage(product.category)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {product.bestSeller && (
          <Badge className="absolute left-2 top-2 bg-accent text-accent-foreground">Best seller</Badge>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {product.brand} · {product.subcategory}
        </p>
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
          <span className="text-xs text-muted-foreground">/ {product.unit}</span>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => {
              addToCart(product.id);
              toast.success("Added to cart", { description: product.name });
            }}
          >
            <ShoppingCart className="h-4 w-4" /> Add
          </Button>
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
