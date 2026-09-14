import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, Search, ShoppingCart, FileText, FlaskConical, User, Phone } from "lucide-react";
import { COMPANY } from "@/lib/catalog-utils";
import { useCategories } from "@/lib/queries/products";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
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
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
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
    navigate({ to: "/shop", search: { q: q || undefined, category: cat === "all" ? undefined : cat } });
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="bg-primary-dark text-primary-foreground">
        <div className="container-page flex h-9 items-center justify-between text-xs">
          <p className="hidden sm:block">Laboratory & scientific supplies delivered nationwide in Ghana</p>
          <div className="flex items-center gap-4">
            <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> {COMPANY.phone}
            </a>
            <a href={`mailto:${COMPANY.email}`} className="hidden md:inline">
              {COMPANY.email}
            </a>
          </div>
        </div>
      </div>

      <div className="container-page flex h-16 items-center gap-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto p-6" aria-describedby={undefined}>
            <SheetTitle className="absolute h-px w-px overflow-hidden whitespace-nowrap p-0 [clip:rect(0,0,0,0)]">
              Menu
            </SheetTitle>
            <p className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Categories
            </p>
            <nav className="mt-3 flex flex-col" aria-label="Product categories">
              {(categories ?? []).map((c) => (
                <Link
                  key={c.slug}
                  to="/shop"
                  search={{ category: c.slug }}
                  onClick={() => setMobileOpen(false)}
                  className="min-h-11 border-b border-border py-2.5 text-sm"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
            <nav className="mt-6 flex flex-col gap-2 text-sm" aria-label="Site">
              {publicNav.map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className="min-h-11 py-2">
                  {l.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-primary text-primary-foreground">
            <FlaskConical className="h-5 w-5" />
          </span>
          <span className="leading-none">
            <span className="block font-display text-lg font-extrabold tracking-tight">TLB</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Enterprise
            </span>
          </span>
        </Link>

        <form onSubmit={submit} className="ml-2 hidden flex-1 items-center md:flex">
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-44 rounded-r-none border-r-0 bg-secondary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
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
            placeholder="Search reagents, glassware, equipment…"
            aria-label="Search products"
            className="rounded-none"
          />
          <Button type="submit" className="rounded-l-none bg-accent text-accent-foreground hover:bg-accent/90" aria-label="Search">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" className="relative" aria-label="Quote list">
            <Link to="/quote">
              <FileText className="h-5 w-5" />
              <CountBadge count={quoteCount} />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="relative" aria-label="Cart">
            <Link to="/cart">
              <ShoppingCart className="h-5 w-5" />
              <CountBadge count={cartCount} />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link to={user ? "/account" : "/auth"}>
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user ? "Account" : "Sign in"}</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="border-t border-border bg-secondary/60">
        <div className="container-page flex h-11 items-center gap-1 text-sm">
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
              className="flex h-11 items-center gap-2 bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Menu className="h-4 w-4" /> Shop by category
            </button>
            <div
              id="category-menu"
              hidden={!megaOpen}
              className={cn(
                "absolute left-0 top-11 z-50 w-[min(64rem,90vw)] rounded-b-md border border-border bg-popover p-6 shadow-pop",
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
                      className="font-display text-sm font-bold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

          <nav className="hidden items-center gap-1 lg:flex">
            {publicNav.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded px-3 py-1.5 font-medium text-secondary-foreground hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                activeProps={{ className: "text-primary" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <form onSubmit={submit} className="container-page flex items-center gap-2 py-2 md:hidden">
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
        />
        <Button type="submit" size="icon" className="bg-accent text-accent-foreground hover:bg-accent/90" aria-label="Search">
          <Search className="h-4 w-4" />
        </Button>
      </form>
    </header>
  );
}
