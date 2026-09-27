import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
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
    <section id="categories" className="bg-primary-soft" aria-labelledby="home-categories-heading">
      <div className="container-page py-12 lg:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary">Product categories</p>
            <h2 id="home-categories-heading" className="mt-2 text-3xl font-bold tracking-tight text-neutral-950 sm:text-[2.35rem] sm:leading-tight">
              Explore our product categories
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Eight core ranges covering the full laboratory workflow.
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            View all categories
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {error ? (
          <p className="mt-8 text-sm text-muted-foreground">Could not load categories. Please try again shortly.</p>
        ) : (
          <ul className="-mx-4 mt-8 flex list-none gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory scrollbar-none sm:mx-0 sm:px-0">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <li key={i}>
                    <Skeleton className="h-56 w-[13.25rem] shrink-0 rounded-xl" />
                  </li>
                ))
              : (categories ?? []).map((c) => (
                  <li key={c.slug} className="shrink-0 snap-start">
                    <Link
                      to="/shop"
                      search={{ category: c.slug }}
                      className="group flex w-[13.25rem] flex-col overflow-hidden rounded-xl bg-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <span className="relative aspect-[4/3] overflow-hidden bg-[#f5f4f6]">
                        <img
                          src={c.image}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.04]"
                        />
                      </span>
                      <span className="flex items-center justify-between gap-2 px-3 py-3.5">
                        <span className="line-clamp-1 text-sm font-semibold text-foreground">{c.name}</span>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
          </ul>
        )}
      </div>
    </section>
  );
}
