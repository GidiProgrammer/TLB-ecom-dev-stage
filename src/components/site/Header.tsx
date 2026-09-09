import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
      {count}
    </span>
  );
}

export function Header() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { cartCount, quoteCount } = useStore();
  const { data: categories } = useCategories();
  const { user } = useAuth();
  const navigate = useNavigate();

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
          <SheetContent side="left" className="w-80 overflow-y-auto p-6">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Categories
            </p>
            <nav className="mt-3 flex flex-col">
              {(categories ?? []).map((c) => (
                <Link
                  key={c.slug}
                  to="/shop"
                  search={{ category: c.slug }}
                  onClick={() => setMobileOpen(false)}
                  className="border-b border-border py-2.5 text-sm"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
            <nav className="mt-6 flex flex-col gap-2 text-sm">
              <Link to="/shop" onClick={() => setMobileOpen(false)}>All products</Link>
              <Link to="/quote" onClick={() => setMobileOpen(false)}>Request a quote</Link>
              <Link to="/experiments" onClick={() => setMobileOpen(false)}>My experiments</Link>
              <Link to="/blog" onClick={() => setMobileOpen(false)}>Knowledge hub</Link>
              <Link to="/about" onClick={() => setMobileOpen(false)}>About</Link>
              <Link to="/contact" onClick={() => setMobileOpen(false)}>Contact</Link>
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
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search reagents, glassware, equipment…"
            aria-label="Search products"
            className="rounded-none"
          />
          <Button type="submit" className="rounded-l-none bg-accent text-accent-foreground hover:bg-accent/90">
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
          >
            <button
              onClick={() => setMegaOpen((v) => !v)}
              className="flex h-11 items-center gap-2 bg-primary px-4 font-semibold text-primary-foreground"
            >
              <Menu className="h-4 w-4" /> Shop by category
            </button>
            <div
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
                      className="font-display text-sm font-bold text-foreground hover:text-primary"
                    >
                      {c.name}
                    </Link>
                    <ul className="mt-2 space-y-1">
                      {c.subcategories.slice(0, 5).map((s) => (
                        <li key={s.name}>
                          <Link
                            to="/shop"
                            search={{ category: c.slug, sub: s.name }}
                            onClick={() => setMegaOpen(false)}
                            className="text-xs text-muted-foreground hover:text-primary"
                          >
                            {s.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {[
              { to: "/shop", label: "All products" },
              { to: "/quote", label: "Request a quote" },
              { to: "/experiments", label: "My experiments" },
              { to: "/blog", label: "Knowledge hub" },
              { to: "/about", label: "About us" },
              { to: "/contact", label: "Contact" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded px-3 py-1.5 font-medium text-secondary-foreground hover:bg-background"
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
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
        />
        <Button type="submit" size="icon" className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Search className="h-4 w-4" />
        </Button>
      </form>
    </header>
  );
}
