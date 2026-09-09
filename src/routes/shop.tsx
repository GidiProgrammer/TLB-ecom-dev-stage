import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { formatGHS } from "@/lib/catalog-utils";
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
  sub?: string | undefined;
  sort?: string | undefined;
  max?: number | undefined;
};

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    q: typeof search['q'] === "string" && search['q'] ? search['q'] : undefined,
    category: typeof search['category'] === "string" ? search['category'] : undefined,
    sub: typeof search['sub'] === "string" ? search['sub'] : undefined,
    sort: typeof search['sort'] === "string" ? search['sort'] : undefined,
    max: typeof search['max'] === "number" ? search['max'] : undefined,
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
        content: "Filter by category, brand and price across our full laboratory catalogue.",
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

  const { data: products, isLoading: productsLoading, error: productsError } = useProducts({
    search: search.q,
    categorySlug: activeCategory === "all" ? undefined : activeCategory,
    sort: search.sort,
  });
  const results = (products ?? []).filter((p) => (search.sub ? p.subcategory === search.sub : true));

  const setSearch = (next: Partial<ShopSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...next }) });

  return (
    <div className="container-page py-10">
      <nav className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link> / <span>Shop</span>
        {category && <> / <span className="text-foreground">{category.name}</span></>}
      </nav>

      <header className="mt-3">
        <h1 className="font-display text-3xl font-extrabold">
          {category ? category.name : search.q ? `Results for “${search.q}”` : "All products"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {category ? category.description : "Our complete range of laboratory chemicals, instruments, glassware, safety equipment and consumables."}
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-6">
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wide">Categories</h2>
            <ul className="mt-3 space-y-1 text-sm">
              <li>
                <button
                  onClick={() => setSearch({ category: undefined, sub: undefined })}
                  className={activeCategory === "all" ? "font-semibold text-primary" : "text-muted-foreground hover:text-primary"}
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
                    onClick={() => setSearch({ category: c.slug, sub: undefined })}
                    className={activeCategory === c.slug ? "text-left font-semibold text-primary" : "text-left text-muted-foreground hover:text-primary"}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {category && (
            <div>
              <h2 className="font-display text-sm font-bold uppercase tracking-wide">Subcategories</h2>
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  <button
                    onClick={() => setSearch({ sub: undefined })}
                    className={!search.sub ? "font-semibold text-primary" : "text-muted-foreground hover:text-primary"}
                  >
                    All
                  </button>
                </li>
                {category.subcategories.map((s) => (
                  <li key={s.name}>
                    <button
                      onClick={() => setSearch({ sub: s.name })}
                      className={search.sub === s.name ? "text-left font-semibold text-primary" : "text-left text-muted-foreground hover:text-primary"}
                    >
                      {s.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-md border border-border bg-primary-soft p-4">
            <p className="font-display text-sm font-bold">Need bulk pricing?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add items to a quote request and we'll respond with institutional pricing.
            </p>
            <Button asChild size="sm" className="mt-3 w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/quote">Open quote request</Link>
            </Button>
          </div>
        </aside>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <p className="text-sm text-muted-foreground">
              {results.length} product{results.length === 1 ? "" : "s"}
              {results.length > 0 && (
                <> · from {formatGHS(Math.min(...results.map((r) => r.price)))}</>
              )}
            </p>
            <Select value={search.sort ?? "relevance"} onValueChange={(v) => setSearch({ sort: v === "relevance" ? undefined : v })}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Sort: Relevance</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
                <SelectItem value="price-asc">Price: low to high</SelectItem>
                <SelectItem value="price-desc">Price: high to low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {productsLoading ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-4/3 w-full rounded-md" />
              ))}
            </div>
          ) : productsError ? (
            <div className="mt-10 rounded-md border border-dashed border-border p-10 text-center">
              <p className="font-display text-lg font-bold">Could not load products</p>
              <p className="mt-2 text-sm text-muted-foreground">Please try again shortly.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="mt-10 rounded-md border border-dashed border-border p-10 text-center">
              <p className="font-display text-lg font-bold">No products matched</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a different search term, or request a quote and we will source it for you.
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
    </div>
  );
}
