import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import type { CatalogProduct } from "@/lib/queries/products";
import { ProductCard } from "@/components/site/ProductCard";
import { RailScrollCue } from "@/components/site/RailScrollCue";
import { Skeleton } from "@/components/ui/skeleton";

/** Core ranges. First product in each is the catalogue’s name order, not a ranking. */
const RANGES = [
  { slug: "laboratory-equipment", name: "Laboratory Equipment" },
  { slug: "analytical-chemicals", name: "Analytical Chemicals" },
  { slug: "consumables", name: "Consumables" },
  { slug: "glassware", name: "Glassware" },
] as const;

export function selectRangeProducts(
  products: CatalogProduct[],
  excludeIds: Iterable<string> = [],
): CatalogProduct[] {
  const exclude = new Set(excludeIds);
  return RANGES.flatMap((range) => {
    const inRange = products.filter((product) => product.categorySlug === range.slug);
    const pick = inRange.find((product) => !exclude.has(product.id)) ?? inRange[0];
    return pick ? [pick] : [];
  });
}

export function HomeExploreProducts({
  products,
  isLoading,
  error,
  excludeIds,
}: {
  products: CatalogProduct[] | undefined;
  isLoading: boolean;
  error: unknown;
  excludeIds?: string[];
}) {
  const rangesRef = useRef<HTMLUListElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);
  const selection = selectRangeProducts(products ?? [], excludeIds ?? []);

  return (
    <section className="bg-primary-soft" aria-labelledby="home-explore-heading">
      <div className="container-page py-8">
        <div className="flex items-end justify-between gap-4 border-l-4 border-primary pl-4">
          <div>
            <h2 id="home-explore-heading" className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Explore laboratory supplies
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-snug text-muted-foreground">
              Equipment, analytical chemicals, consumables and glassware from the catalogue.
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-primary hover:underline"
          >
            View catalogue
          </Link>
        </div>

        <nav aria-label="Shop catalogue ranges" className="mt-4">
          <ul ref={rangesRef} className="-mx-4 flex list-none gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <li>
              <Link
                to="/shop"
                className="inline-flex min-h-11 items-center rounded-md border border-primary/30 bg-white px-3 text-sm font-semibold text-primary hover:border-primary"
              >
                All products
              </Link>
            </li>
            {RANGES.map((range) => (
              <li key={range.slug}>
                <Link
                  to="/shop"
                  search={{ category: range.slug }}
                  className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md border border-primary/30 bg-white px-3 text-sm font-semibold text-primary hover:border-primary"
                >
                  {range.name}
                </Link>
              </li>
            ))}
          </ul>
          <RailScrollCue target={rangesRef} />
        </nav>

        {error ? (
          <p className="mt-6 text-sm text-muted-foreground">Could not load catalogue products. Please try again shortly.</p>
        ) : isLoading ? (
          <>
          <div ref={loadingRef} className="-mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[22rem] w-64 shrink-0 rounded-lg md:w-auto" />
            ))}
          </div>
          <RailScrollCue target={loadingRef} />
          </>
        ) : selection.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No catalogue products to show yet.</p>
        ) : (
          <>
          <div ref={productsRef} className="-mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-1 snap-x snap-mandatory scrollbar-none md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4">
            {selection.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                className="w-64 shrink-0 snap-start md:h-full md:w-auto md:shrink"
              />
            ))}
          </div>
          <RailScrollCue target={productsRef} />
          </>
        )}
      </div>
    </section>
  );
}
