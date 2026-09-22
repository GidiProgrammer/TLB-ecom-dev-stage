import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Mail, Menu, Phone, Search, ShoppingCart, FileText, User } from "lucide-react";
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

const publicNav = [
  { to: "/shop", label: "All products" },
  { to: "/quote", label: "Request a quote" },
  { to: "/blog", label: "Knowledge hub" },
  { to: "/about", label: "About us" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [megaOpen, setMegaOpen] = useState(false);
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
      <div className="bg-primary text-primary-foreground">
        <div className="container-page flex min-h-9 flex-wrap items-center justify-between gap-x-4 text-xs">
          <div className="flex flex-wrap items-center gap-x-4">
            <a
              href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}
              className="inline-flex min-h-11 items-center gap-1.5 hover:text-gold"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              {COMPANY.phone}
            </a>
            <a
              href={`mailto:${COMPANY.email}`}
              className="hidden min-h-11 items-center gap-1.5 hover:text-gold sm:inline-flex"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {COMPANY.email}
            </a>
          </div>
          <Link to="/contact" className="inline-flex min-h-11 items-center hover:text-gold">
            Contact
          </Link>
        </div>
      </div>

      <div className="container-page flex min-h-16 items-center gap-3 py-2">
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
              {publicNav.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-11 items-center"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex min-h-11 items-center gap-2">
          <BrandLogo className="h-11" />
        </Link>

        <form onSubmit={submit} className="mx-auto hidden min-h-11 max-w-xl flex-1 items-center md:flex">
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="h-11 min-h-11 w-28 shrink-0 rounded-r-none border-r-0 bg-muted">
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
            className="h-11 min-h-11 rounded-none"
          />
          <Button type="submit" className="h-11 min-h-11 rounded-l-none bg-gold px-5 text-gold-foreground hover:bg-gold/90">
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
          <Button asChild className="h-11 min-h-11 gap-1.5 bg-gold px-3 text-gold-foreground hover:bg-gold/90">
            <Link to={user ? "/account" : "/auth"} activeOptions={{ exact: true }}>
              <User className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{user ? "Account" : "Sign in"}</span>
              <span className="sm:hidden">{user ? "Account" : "Sign in"}</span>
            </Link>
          </Button>
        </nav>
      </div>

      <div className="border-t border-border bg-card">
        <div className="container-page flex min-h-11 items-center gap-2 text-sm">
          <div
            className="relative"
            onMouseEnter={() => setMegaOpen(true)}
            onMouseLeave={() => setMegaOpen(false)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setMegaOpen(false);
            }}
          >
            <button
              type="button"
              aria-expanded={megaOpen}
              aria-controls="category-menu"
              onClick={() => setMegaOpen((v) => !v)}
              onFocus={() => setMegaOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setMegaOpen(false);
              }}
              className="flex min-h-11 items-center gap-2 border-r border-border px-3 font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Menu className="h-4 w-4" aria-hidden /> Shop by category
            </button>
            <div
              id="category-menu"
              hidden={!megaOpen}
              className={cn(
                "absolute left-0 top-11 z-50 w-[min(64rem,90vw)] border border-border bg-popover p-6 shadow-pop",
                megaOpen ? "block" : "hidden",
              )}
            >
              <div className="grid gap-6 md:grid-cols-4">
                {(categories ?? []).map((c) => (
                  <div key={c.slug}>
                    <Link
                      to="/shop"
                      search={{ category: c.slug }}
                      onClick={() => setMegaOpen(false)}
                      className="text-sm font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {c.name}
                    </Link>
                    {c.description ? (
                      <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{c.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {publicNav.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="inline-flex min-h-11 items-center rounded px-3 font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                activeProps={{ className: "text-primary" }}
              >
                {l.label}
              </Link>
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
        <Button type="submit" className="h-11 min-h-11 min-w-11 bg-gold px-3 text-gold-foreground hover:bg-gold/90">
          <Search className="h-4 w-4" aria-hidden />
          <span className="sr-only">Search</span>
        </Button>
      </form>
    </header>
  );
}
