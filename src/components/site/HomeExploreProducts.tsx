import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Beaker, Box, ChevronLeft, ChevronRight, FlaskConical, TestTube } from "lucide-react";
import type { CatalogProduct } from "@/lib/queries/products";
import { ProductCard } from "@/components/site/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Core ranges. First product in each is the catalogue’s name order, not a ranking. */
const RANGES = [
  { slug: "laboratory-equipment", name: "Laboratory Equipment", icon: FlaskConical },
  { slug: "analytical-chemicals", name: "Analytical Chemicals", icon: Beaker },
  { slug: "consumables", name: "Consumables", icon: Box },
  { slug: "glassware", name: "Glassware", icon: TestTube },
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
  const railRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]["slug"] | "all">("all");
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const catalogue = products ?? [];
  const selection =
    range === "all"
      ? selectRangeProducts(catalogue, excludeIds ?? [])
      : catalogue.filter((product) => product.categorySlug === range);
  const selectionIds = selection.map((product) => product.id).join("|");

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
  }, [isLoading, selectionIds]);

  const scrollToPage = (nextPage: number) => {
    const el = railRef.current;
    if (!el) return;
    const { step, max, count } = pageMetrics(el);
    const target = Math.min(count - 1, Math.max(0, nextPage));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: Math.min(max, target * step), behavior: reduced ? "auto" : "smooth" });
  };

  const chooseRange = (next: (typeof RANGES)[number]["slug"] | "all") => {
    setRange(next);
    railRef.current?.scrollTo({ left: 0 });
  };

  return (
    <section className="bg-primary-soft" aria-labelledby="home-explore-heading">
      <div className="container-page py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Product catalogue</p>
            <h2 id="home-explore-heading" className="mt-2 text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">
              Explore <span className="text-primary">laboratory supplies</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Equipment, analytical chemicals, consumables and glassware from the catalogue.
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            View catalogue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto scrollbar-none" role="group" aria-label="Shop catalogue ranges">
            <button
              type="button"
              className={cn(
                "inline-flex h-11 shrink-0 cursor-pointer items-center rounded-full px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                range === "all" ? "bg-primary text-primary-foreground" : "border border-border bg-white text-foreground hover:bg-neutral-50",
              )}
              aria-pressed={range === "all"}
              onClick={() => chooseRange("all")}
            >
              All products
            </button>
            {RANGES.map((item) => {
              const Icon = item.icon;
              const selected = range === item.slug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  className={cn(
                    "inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected ? "bg-primary text-primary-foreground" : "border border-border bg-white text-foreground hover:bg-neutral-50",
                  )}
                  aria-pressed={selected}
                  onClick={() => chooseRange(item.slug)}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.name}
                </button>
              );
            })}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-border bg-white text-primary shadow-sm hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous products"
              disabled={page <= 0}
              onClick={() => scrollToPage(page - 1)}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-deep-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next products"
              disabled={page >= pageCount - 1}
              onClick={() => scrollToPage(page + 1)}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-6 text-sm text-muted-foreground">Could not load catalogue products. Please try again shortly.</p>
        ) : isLoading ? (
          <div className="mt-5 flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[22rem] w-64 shrink-0 rounded-card" />
            ))}
          </div>
        ) : selection.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No catalogue products to show yet.</p>
        ) : (
          <div ref={railRef} className="mt-5 flex gap-4 overflow-x-auto pb-1 snap-x snap-proximity scrollbar-none">
            {selection.map((product) => (
              <ProductCard key={product.id} product={product} className="w-64 shrink-0 snap-start sm:w-72" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
