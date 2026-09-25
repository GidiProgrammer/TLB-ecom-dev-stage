import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { formatGHS } from "@/lib/catalog-utils";
import { isWildcardOnlySearch } from "@/lib/product-search";
import { normalizeShopSort } from "@/lib/shop-search";
import { useCategories, useProducts } from "@/lib/queries/products";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ShopSearch = {
  q?: string | undefined;
  category?: string | undefined;
  sort?: string | undefined;
  inStock?: boolean | undefined;
};

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    q: typeof search["q"] === "string" && search["q"] ? search["q"] : undefined,
    category: typeof search["category"] === "string" ? search["category"] : undefined,
    sort: normalizeShopSort(search["sort"]),
    inStock: search["inStock"] === true || search["inStock"] === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop laboratory chemicals, equipment & glassware — TLB Enterprise" },
      {
        name: "description",
        content:
          "Browse analytical chemicals, laboratory equipment, glassware, PPE, consumables and furniture with Ghana cedi pricing and institutional quotes.",
      },
      { property: "og:title", content: "Shop laboratory supplies — TLB Enterprise" },
      {
        property: "og:description",
        content: "Filter by category and sort by name or price across our laboratory catalogue.",
      },
    ],
  }),
  component: Shop,
});

function Shop() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const activeCategory = search.category ?? "all";
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();
  const category = activeCategory === "all" ? undefined : categories?.find((c) => c.slug === activeCategory);
  const categoriesReady = !categoriesLoading && !categoriesError;
  const unmatchedSearch = Boolean(search.q && isWildcardOnlySearch(search.q));
  const invalidCategory = Boolean(
    search.category &&
      search.category !== "all" &&
      categoriesReady &&
      !(categories ?? []).some((c) => c.slug === search.category),
  );

  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
    refetch,
  } = useProducts({
    search: search.q,
    categorySlug: invalidCategory || activeCategory === "all" ? undefined : activeCategory,
    sort: search.sort,
    inStock: Boolean(search.inStock),
    enabled: !invalidCategory && !unmatchedSearch,
  });
  const results = unmatchedSearch ? [] : (products ?? []);

  const setSearch = (next: Partial<ShopSearch>) =>
    navigate({ to: "/shop", search: { ...search, ...next } });

  return (
    <div className="container-page py-10">
      <nav className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link> / <span>Shop</span>
        {category && <> / <span className="text-foreground">{category.name}</span></>}
      </nav>

      {invalidCategory ? (
        <div className="mt-10 rounded-md border border-dashed border-border p-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Category not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            That category is not in our catalogue. Browse all products or pick a listed category.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/shop">View all products</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/" hash="categories">
                Browse categories
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <header className="mt-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {category
                ? category.name
                : search.category && !categoriesReady
                  ? "Shop"
                  : search.q
                    ? `Results for “${search.q}”`
                    : "All products"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {category
                ? category.description
                : "Our complete range of laboratory chemicals, instruments, glassware, safety equipment and consumables."}
            </p>
          </header>

          <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr]">
            <aside className="space-y-6 lg:sticky lg:top-[calc(var(--site-header-height)+40px)] lg:max-h-[calc(100dvh-var(--site-header-height)-40px)] lg:self-start lg:overflow-y-auto">
              <div>
                <h2 className="font-display text-sm font-bold uppercase tracking-wide">Categories</h2>
                <ul className="mt-3 space-y-1 text-sm">
                  <li>
                    <button
                      type="button"
                      onClick={() => setSearch({ category: undefined })}
                      className={
                        activeCategory === "all"
                          ? "flex min-h-11 w-full items-center border-l-2 border-gold bg-primary-soft px-3 text-left font-semibold text-primary"
                          : "flex min-h-11 w-full items-center px-3 text-left text-foreground hover:bg-muted hover:text-primary"
                      }
                    >
                      All categories
                    </button>
                  </li>
                  {categoriesLoading ? (
                    <li className="text-sm text-muted-foreground">Loading…</li>
                  ) : categoriesError ? (
                    <li className="text-sm text-muted-foreground">Could not load categories.</li>
                  ) : (categories ?? []).map((c) => (
                    <li key={c.slug}>
                      <button
                        type="button"
                        onClick={() => setSearch({ category: c.slug })}
                        className={
                          activeCategory === c.slug
                            ? "flex min-h-11 w-full items-center border-l-2 border-gold bg-primary-soft px-3 text-left font-semibold text-primary"
                            : "flex min-h-11 w-full items-center px-3 text-left text-foreground hover:bg-muted hover:text-primary"
                        }
                      >
                        {c.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

                <div>
                  <h2 className="font-display text-sm font-bold uppercase tracking-wide">Availability</h2>
                  <div className="mt-3 flex min-h-11 items-center gap-2 text-sm">
                    <input
                      id="filter-in-stock"
                      type="checkbox"
                      checked={Boolean(search.inStock)}
                      onChange={(e) => setSearch({ inStock: e.target.checked ? true : undefined })}
                    />
                    <label htmlFor="filter-in-stock" className="cursor-pointer">
                      In stock only
                    </label>
                  </div>
                </div>

              <div className="rounded-md border border-border bg-primary-soft p-4">
                <p className="font-display text-sm font-bold">Need a quotation?</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Add items to a quote request and our team will review quantities and provide pricing.
                </p>
                <Button asChild size="sm" className="mt-3 w-full bg-gold text-gold-foreground hover:bg-gold-hover">
                  <Link to="/quote">Open quote request</Link>
                </Button>
              </div>
            </aside>

            <section>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {unmatchedSearch
                    ? "0 products"
                    : productsLoading
                      ? "Loading products…"
                      : productsError
                        ? "Unable to load product count"
                        : `${results.length} product${results.length === 1 ? "" : "s"}`}
                  {!productsLoading && !productsError && results.length > 0 && (
                    <> · from {formatGHS(Math.min(...results.map((r) => r.price)))}</>
                  )}
                </p>
                <Select
                  value={search.sort ?? "name"}
                  onValueChange={(v) => setSearch({ sort: v === "name" ? undefined : v })}
                >
                  <SelectTrigger className="w-full sm:w-48" aria-label="Sort products">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name A–Z</SelectItem>
                    <SelectItem value="price-asc">Price: low to high</SelectItem>
                    <SelectItem value="price-desc">Price: high to low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {productsLoading && !unmatchedSearch ? (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-4/3 w-full rounded-md" />
                  ))}
                </div>
              ) : productsError && !unmatchedSearch ? (
                <div className="mt-10 rounded-md border border-dashed border-border p-10 text-center">
                  <p className="font-display text-lg font-bold">Could not load products</p>
                  <p className="mt-2 text-sm text-muted-foreground">Please try again.</p>
                  <Button type="button" className="mt-4" variant="outline" onClick={() => void refetch()}>
                    Retry
                  </Button>
                </div>
              ) : results.length === 0 ? (
                <div className="mt-10 rounded-md border border-dashed border-border p-10 text-center">
                  <p className="font-display text-lg font-bold">No products matched</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {unmatchedSearch
                      ? "That search has no catalogue matches. Try a product name, SKU, or category."
                      : search.inStock
                        ? "No in-stock products matched these filters. Clear the in-stock filter or try another category."
                        : "Try a different search term, or request a quote and we will source it for you."}
                  </p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link to="/contact">Ask our team</Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {results.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
