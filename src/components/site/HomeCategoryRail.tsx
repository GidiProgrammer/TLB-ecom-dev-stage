import { Link } from "@tanstack/react-router";
import type { CatalogCategory } from "@/lib/queries/products";
import { Skeleton } from "@/components/ui/skeleton";

export function HomeCategoryRail({
  categories,
  isLoading,
  error,
}: {
  categories: CatalogCategory[] | undefined;
  isLoading: boolean;
  error: unknown;
}) {
  return (
    <section id="categories" className="container-page pb-12" aria-labelledby="home-categories-heading">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="home-categories-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Explore our product categories
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Eight core ranges covering the full laboratory workflow.</p>
        </div>
        <Link
          to="/shop"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
        >
          Shop all
        </Link>
      </div>

      {error ? (
        <p className="mt-6 text-sm text-muted-foreground">Could not load categories. Please try again shortly.</p>
      ) : (
        <ul className="-mx-4 mt-6 flex list-none gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory [scrollbar-width:thin] sm:mx-0 sm:px-0">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-14 w-44 shrink-0 rounded-md" />
                </li>
              ))
            : (categories ?? []).map((c) => (
                <li key={c.slug} className="shrink-0 snap-start">
                  <Link
                    to="/shop"
                    search={{ category: c.slug }}
                    aria-label={c.name}
                    className="group flex min-h-14 w-[11.5rem] items-center gap-3 overflow-hidden rounded-md border border-border bg-card pr-3 transition-shadow hover:shadow-card"
                  >
                    <span className="h-14 w-14 shrink-0 overflow-hidden bg-secondary">
                      <img src={c.image} alt="" className="h-full w-full object-cover" />
                    </span>
                    <span className="min-w-0 font-display text-sm font-bold leading-snug group-hover:text-primary">
                      {c.name}
                    </span>
                  </Link>
                </li>
              ))}
        </ul>
      )}
    </section>
  );
}
