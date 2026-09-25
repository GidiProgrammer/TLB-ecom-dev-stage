import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import type { CatalogProduct } from "@/lib/queries/products";
import { ProductCard } from "@/components/site/ProductCard";
import { RailScrollCue } from "@/components/site/RailScrollCue";
import { Skeleton } from "@/components/ui/skeleton";

export function HomeProductRail({
  products,
  isLoading,
  error,
}: {
  products: CatalogProduct[] | undefined;
  isLoading: boolean;
  error: unknown;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  return (
    <section className="container-page pb-10" aria-labelledby="home-new-heading">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="home-new-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
            New in catalogue
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Recently added laboratory supplies.</p>
        </div>
        <Link
          to="/shop"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      {error ? (
        <p className="mt-6 text-sm text-muted-foreground">Could not load new catalogue items. Please try again shortly.</p>
      ) : (
        <>
        <div ref={railRef} className="-mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-1 snap-x snap-mandatory scrollbar-none sm:mx-0 sm:px-0">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-4/3 h-[22rem] w-64 shrink-0 rounded-lg" />
              ))
            : (products ?? []).map((p) => (
                <ProductCard key={p.id} product={p} className="w-64 shrink-0 snap-start" />
              ))}
        </div>
        <RailScrollCue target={railRef} />
        </>
      )}
    </section>
  );
}
