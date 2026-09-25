import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import type { CatalogCategory } from "@/lib/queries/products";
import { RailScrollCue } from "@/components/site/RailScrollCue";
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
  const railRef = useRef<HTMLUListElement>(null);

  return (
    <section id="categories" className="container-page py-8" aria-labelledby="home-categories-heading">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="home-categories-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
            Explore our product categories
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Eight core ranges covering the full laboratory workflow.</p>
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
        <>
        <ul ref={railRef} className="-mx-4 mt-5 flex list-none gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory scrollbar-none sm:mx-0 sm:px-0">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-44 w-52 shrink-0 rounded-lg" />
                </li>
              ))
            : (categories ?? []).map((c) => (
                <li key={c.slug} className="shrink-0 snap-start">
                  <Link
                    to="/shop"
                    search={{ category: c.slug }}
                    className="group flex h-44 w-52 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-[border-color,box-shadow] duration-200 hover:border-primary hover:shadow-pop"
                  >
                    <span className="relative min-h-0 flex-1 overflow-hidden bg-neutral-100">
                      <img
                        src={c.image}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.04]"
                      />
                    </span>
                    <span className="line-clamp-2 min-h-11 bg-deep-purple px-3 py-2 text-sm font-semibold leading-snug text-white">
                      {c.name}
                    </span>
                  </Link>
                </li>
              ))}
        </ul>
        <RailScrollCue target={railRef} />
        </>
      )}
    </section>
  );
}
