import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { CatalogProduct } from "@/lib/queries/products";
import { ProductCard } from "@/components/site/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

function pageStep(el: HTMLElement) {
  const card = el.firstElementChild;
  if (!(card instanceof HTMLElement)) return el.clientWidth;
  const styles = getComputedStyle(el);
  const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
  const cardWidth = card.getBoundingClientRect().width + gap;
  if (cardWidth <= 0) return el.clientWidth;
  const visible = Math.max(1, Math.floor((el.clientWidth + gap) / cardWidth));
  return visible * cardWidth;
}

function pageMetrics(el: HTMLElement) {
  const step = pageStep(el);
  const max = Math.max(0, el.scrollWidth - el.clientWidth);
  const count = max <= 2 ? 1 : Math.floor((max - 1) / step) + 2;
  const index = Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / step)));
  return { step, max, count, index };
}

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
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    const sync = () => {
      const metrics = pageMetrics(el);
      setPageCount(metrics.count);
      setPage(metrics.index);
    };

    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const resize = new ResizeObserver(sync);
    resize.observe(el);
    for (const child of el.children) resize.observe(child);
    const mutations = new MutationObserver(() => {
      for (const child of el.children) resize.observe(child);
      sync();
    });
    mutations.observe(el, { childList: true });

    return () => {
      el.removeEventListener("scroll", sync);
      resize.disconnect();
      mutations.disconnect();
    };
  }, [isLoading, products]);

  const scrollToPage = (nextPage: number) => {
    const el = railRef.current;
    if (!el) return;
    const { step, max, count } = pageMetrics(el);
    const target = Math.min(count - 1, Math.max(0, nextPage));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({
      left: Math.min(max, target * step),
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <section className="container-page pt-14 pb-10 lg:pt-16" aria-labelledby="home-new-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">New arrivals</p>
          <h2 id="home-new-heading" className="mt-2 text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">
            New in catalogue
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Recently added laboratory supplies.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-border bg-white text-primary shadow-sm hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous products"
            disabled={page <= 0}
            onClick={() => scrollToPage(page - 1)}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-deep-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next products"
            disabled={page >= pageCount - 1}
            onClick={() => scrollToPage(page + 1)}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
          <Link
            to="/shop"
            className="ml-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            View all
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mt-6 text-sm text-muted-foreground">Could not load new catalogue items. Please try again shortly.</p>
      ) : (
        <>
          <div
            ref={railRef}
            className="-mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-1 snap-x snap-proximity scrollbar-none sm:mx-0 sm:px-0"
          >
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-4/3 h-[22rem] w-64 shrink-0 snap-start rounded-card" />
                ))
              : (products ?? []).map((p, index) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    {...(index === 0 ? { badge: "New" } : {})}
                    className="w-64 shrink-0 snap-start"
                  />
                ))}
          </div>
          {pageCount > 1 ? (
            <div className="mt-4 flex justify-center gap-2" role="group" aria-label="New arrivals pages">
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className="inline-flex h-6 items-center px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={`Show page ${i + 1} of ${pageCount}`}
                  aria-current={i === page ? "true" : undefined}
                  onClick={() => scrollToPage(i)}
                >
                  <span className={`block h-1 w-6 rounded-full ${i === page ? "bg-primary" : "bg-[#d9d4e2]"}`} aria-hidden />
                </button>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
