import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, Search, ShoppingCart, FileText, User } from "lucide-react";
import { COMPANY } from "@/lib/catalog-utils";
import { normalizeShopSort } from "@/lib/shop-search";
import { useCategories } from "@/lib/queries/products";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { BrandLogo } from "@/components/site/BrandLogo";
import { NotificationBell } from "@/components/site/NotificationBell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-gold px-1 text-[11px] font-semibold text-gold-foreground">
      {count}
    </span>
  );
}

type ShopDeepLink = {
  label: string;
  to: "/shop";
  search?: { inStock?: true; sort?: "price-asc" | "price-desc" };
};
type HashDeepLink =
  | { label: string; to: "/"; hash: string }
  | { label: string; to: "/quote" | "/about" | "/contact"; hash?: string };
type ArticleDeepLink = { label: string; to: "/blog/$slug"; slug: string };
type ExternalDeepLink = { label: string; href: string };
type DeepLink = ShopDeepLink | HashDeepLink | ArticleDeepLink | ExternalDeepLink;

const publicNav: {
  id: string;
  to: "/shop" | "/quote" | "/about" | "/contact";
  label: string;
  align: "left" | "right";
  links: DeepLink[];
}[] = [
  {
    id: "products",
    to: "/shop",
    label: "All products",
    align: "left",
    links: [
      { label: "Full catalogue", to: "/shop" },
      { label: "In stock", to: "/shop", search: { inStock: true } },
      { label: "Lowest price", to: "/shop", search: { sort: "price-asc" } },
      { label: "Highest price", to: "/shop", search: { sort: "price-desc" } },
    ],
  },
  {
    id: "quote",
    to: "/quote",
    label: "Request a quote",
    align: "left",
    links: [
      { label: "Quote list", to: "/quote", hash: "quote-items" },
      { label: "Your details", to: "/quote", hash: "quote-details" },
      { label: "How ordering works", to: "/", hash: "ordering" },
      { label: "Bulk ordering for institutions", to: "/blog/$slug", slug: "bulk-ordering-for-institutions" },
    ],
  },
  {
    id: "about",
    to: "/about",
    label: "About us",
    align: "right",
    links: [
      { label: "What we do", to: "/about", hash: "what-we-do" },
      { label: "Account types", to: "/about", hash: "account-types" },
      { label: "How we work", to: "/about", hash: "how-we-work" },
      { label: "Visit us", to: "/about", hash: "visit" },
    ],
  },
  {
    id: "contact",
    to: "/contact",
    label: "Contact",
    align: "right",
    links: [
      { label: "Send a message", to: "/contact", hash: "message" },
      { label: "Visit us", to: "/contact", hash: "visit" },
      { label: `Call ${COMPANY.phone}`, href: `tel:${COMPANY.phone.replace(/\s/g, "")}` },
      { label: "Email the team", href: `mailto:${COMPANY.email}` },
    ],
  },
];

const deepLinkClass =
  "flex min-h-11 items-center px-3 py-2 text-sm leading-snug text-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function DeepLinkItem({ link, onNavigate }: { link: DeepLink; onNavigate: () => void }) {
  if ("href" in link) {
    return (
      <a href={link.href} className={deepLinkClass} onClick={onNavigate}>
        {link.label}
      </a>
    );
  }
  if (link.to === "/shop") {
    return (
      <Link to="/shop" search={link.search ?? {}} className={deepLinkClass} onClick={onNavigate}>
        {link.label}
      </Link>
    );
  }
  if (link.to === "/blog/$slug") {
    return (
      <Link to="/blog/$slug" params={{ slug: link.slug }} className={deepLinkClass} onClick={onNavigate}>
        {link.label}
      </Link>
    );
  }
  if (link.to === "/") {
    return (
      <Link to="/" hash={link.hash} className={deepLinkClass} onClick={onNavigate}>
        {link.label}
      </Link>
    );
  }
  if (link.hash) {
    return (
      <Link to={link.to} hash={link.hash} className={deepLinkClass} onClick={onNavigate}>
        {link.label}
      </Link>
    );
  }
  return (
    <Link to={link.to} className={deepLinkClass} onClick={onNavigate}>
      {link.label}
    </Link>
  );
}

export function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { cartCount, quoteCount } = useStore();
  const { data: categories } = useCategories();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, search: s.location.searchStr }),
  });

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const sync = () => {
      document.documentElement.style.setProperty("--site-header-height", `${el.offsetHeight}px`);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--site-header-height");
    };
  }, []);

  useEffect(() => {
    if (location.pathname !== "/shop") return;
    const params = new URLSearchParams(
      location.search.startsWith("?") ? location.search.slice(1) : location.search,
    );
    setQ(params.get("q") ?? "");
    setCat(params.get("category") || "all");
  }, [location.pathname, location.search]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const search: { q?: string; category?: string; sort?: string; inStock?: true } = {};
    if (q) search.q = q;
    if (cat !== "all") search.category = cat;
    if (location.pathname === "/shop") {
      const params = new URLSearchParams(
        location.search.startsWith("?") ? location.search.slice(1) : location.search,
      );
      const sort = normalizeShopSort(params.get("sort") ?? undefined);
      if (sort) search.sort = sort;
      if (params.get("inStock") === "true") search.inStock = true;
    }
    navigate({ to: "/shop", search });
    setMobileOpen(false);
  };

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="container-page flex min-h-16 items-center gap-3 py-2.5">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="min-h-11 min-w-11 lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto p-6" aria-describedby={undefined}>
            <SheetTitle className="absolute h-px w-px overflow-hidden whitespace-nowrap p-0 [clip:rect(0,0,0,0)]">
              Menu
            </SheetTitle>
            <BrandLogo className="h-12" />
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Categories
            </p>
            <nav className="mt-3 flex flex-col" aria-label="Product categories">
              {(categories ?? []).map((c) => (
                <Link
                  key={c.slug}
                  to="/shop"
                  search={{ category: c.slug }}
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-11 items-center border-b border-border text-sm"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
            <nav className="mt-6 flex flex-col text-sm" aria-label="Site">
              {publicNav.map((item) => (
                <div key={item.id} className="border-b border-border py-1">
                  <Link
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-11 items-center font-semibold"
                  >
                    {item.label}
                  </Link>
                  <ul className="pb-2">
                    {item.links.map((link) => (
                      <li key={link.label}>
                        <DeepLinkItem link={link} onNavigate={() => setMobileOpen(false)} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex min-h-11 shrink-0 items-center">
          <BrandLogo className="h-11" />
        </Link>

        <form onSubmit={submit} className="mx-auto hidden min-h-11 max-w-xl flex-1 items-stretch rounded-md border border-border bg-card shadow-sm md:flex">
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="h-11 min-h-11 w-28 shrink-0 rounded-none border-0 border-r border-border bg-neutral-50 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {(categories ?? []).map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for products…"
            aria-label="Search products"
            className="h-11 min-h-11 rounded-none border-0 shadow-none"
          />
          <Button type="submit" className="h-11 min-h-11 rounded-none px-5">
            Search
          </Button>
        </form>

        <nav className="ml-auto flex items-center gap-1" aria-label="Account and commerce">
          <Button asChild variant="ghost" className="relative h-11 min-h-11 gap-1.5 px-2.5">
            <Link to="/quote" aria-label="Quote">
              <FileText className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Quote</span>
              <CountBadge count={quoteCount} />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="relative h-11 min-h-11 gap-1.5 px-2.5">
            <Link to="/cart" aria-label="Cart">
              <ShoppingCart className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Cart</span>
              <CountBadge count={cartCount} />
            </Link>
          </Button>
          <NotificationBell />
          <Button asChild variant="outline" className="h-11 min-h-11 gap-1.5 px-3">
            <Link to={user ? "/account" : "/auth"} activeOptions={{ exact: true }}>
              <User className="h-4 w-4" aria-hidden />
              <span>{user ? "Account" : "Sign in"}</span>
            </Link>
          </Button>
          <Button asChild className="h-11 min-h-11 px-3">
            <Link to="/contact">Contact</Link>
          </Button>
        </nav>
      </div>

      <div className="border-t border-white/10 bg-deep-purple text-white">
        <div className="container-page flex min-h-11 items-center gap-2 text-sm">
          <div
            className="relative"
            onMouseEnter={() => setOpenMenu("categories")}
            onMouseLeave={() => setOpenMenu(null)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpenMenu(null);
            }}
          >
            <button
              type="button"
              aria-expanded={openMenu === "categories"}
              aria-controls="category-menu"
              onClick={() => setOpenMenu((current) => (current === "categories" ? null : "categories"))}
              onFocus={() => setOpenMenu("categories")}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpenMenu(null);
              }}
              className="flex min-h-11 items-center gap-2 border-r border-white/15 px-3 font-semibold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-purple"
            >
              <Menu className="h-4 w-4" aria-hidden /> Shop by category
            </button>
            <div
              id="category-menu"
              hidden={openMenu !== "categories"}
              className={cn(
                "absolute left-0 top-11 z-50 w-[min(40rem,90vw)] border border-border bg-popover p-3 shadow-pop",
                openMenu === "categories" ? "block" : "hidden",
              )}
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(categories ?? []).map((c) => (
                  <Link
                    key={c.slug}
                    to="/shop"
                    search={{ category: c.slug }}
                      onClick={() => setOpenMenu(null)}
                    className="group block overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="block aspect-[5/3] overflow-hidden bg-secondary">
                      <img
                        src={c.image}
                        alt=""
                        className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.04]"
                      />
                    </span>
                    <span className="block px-2 py-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                      {c.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Site">
            {publicNav.map((item) => (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => setOpenMenu(item.id)}
                onMouseLeave={() => setOpenMenu(null)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpenMenu(null);
                }}
              >
                <Link
                  to={item.to}
                  aria-expanded={openMenu === item.id}
                  aria-controls={`${item.id}-menu`}
                  onFocus={() => setOpenMenu(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpenMenu(null);
                  }}
                  className="inline-flex min-h-11 items-center rounded px-3 font-medium text-white/90 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-purple"
                  activeProps={{ className: "font-semibold text-white shadow-[inset_0_-2px_0_0_var(--tlb-gold)]" }}
                >
                  {item.label}
                </Link>
                <div
                  id={`${item.id}-menu`}
                  hidden={openMenu !== item.id}
                  className={cn(
                    "absolute top-11 z-50 w-64 border border-border bg-popover py-2 shadow-pop",
                    item.align === "right" ? "right-0" : "left-0",
                    openMenu === item.id ? "block" : "hidden",
                  )}
                >
                  <ul>
                    {item.links.map((link) => (
                      <li key={link.label}>
                        <DeepLinkItem link={link} onNavigate={() => setOpenMenu(null)} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>

      <form onSubmit={submit} className="container-page flex items-center gap-2 pb-2 md:hidden">
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
          className="h-11 min-h-11"
        />
        <Button type="submit" className="h-11 min-h-11 min-w-11 px-3">
          <Search className="h-4 w-4" aria-hidden />
          <span className="sr-only">Search</span>
        </Button>
      </form>
    </header>
  );
}
