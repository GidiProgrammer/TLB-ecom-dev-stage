import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/site/BrandLogo";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav: { to: "/admin" | "/admin/orders" | "/admin/quotes" | "/admin/products" | "/admin/categories" | "/admin/accounts"; label: string; exact?: boolean; group?: string }[] = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/quotes", label: "Quotes" },
  { to: "/admin/products", label: "Products", group: "Catalogue" },
  { to: "/admin/categories", label: "Categories", group: "Catalogue" },
  { to: "/admin/accounts", label: "Accounts" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-1" aria-label="Admin">
      {nav.map((item, i) => {
        const showGroup = Boolean(item.group) && nav[i - 1]?.group !== item.group;
        const active = pathname === item.to;
        return (
          <div key={item.to}>
            {showGroup ? (
              <p className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-white/55">
                {item.group}
              </p>
            ) : null}
            <Link
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex min-h-11 items-center rounded-[8px] px-3 text-sm font-medium text-white/85 hover:bg-white/10",
                "group" in item && "ml-2",
                active && "bg-white/12 text-white shadow-[inset_3px_0_0_0_var(--color-gold)]",
              )}
            >
              {item.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = nav.find((n) => (n.exact ? pathname === n.to : pathname === n.to));

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col bg-deep-purple lg:flex">
        <div className="border-b border-white/10 px-4 py-4">
          <Link to="/admin" className="flex items-center gap-2">
            <BrandLogo className="h-10" />
          </Link>
          <p className="mt-3 text-sm font-semibold text-white">TLB Lab Mart</p>
          <p className="text-xs text-gold">Admin</p>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-4">
          <NavLinks />
        </div>
        <div className="space-y-1 border-t border-white/10 p-3 text-sm">
          <Link to="/" className="flex min-h-11 items-center rounded-[8px] px-3 text-white/80 hover:bg-white/10">
            Storefront
          </Link>
          <Link
            to="/account"
            className="flex min-h-11 items-center rounded-[8px] px-3 text-white/80 hover:bg-white/10"
          >
            Account
          </Link>
          <button
            type="button"
            className="flex min-h-11 w-full items-center rounded-[8px] px-3 text-left text-white/80 hover:bg-white/10"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 items-center gap-3 border-b border-border bg-card px-4 lg:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open admin menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-0 bg-deep-purple p-0 text-white" aria-describedby={undefined}>
              <SheetTitle className="sr-only">Admin menu</SheetTitle>
              <div className="border-b border-white/10 px-4 py-4">
                <p className="text-sm font-semibold">TLB Lab Mart</p>
                <p className="text-xs text-gold">Admin</p>
              </div>
              <div className="p-3">
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <p className="text-sm font-medium text-muted-foreground">{current?.label ?? "Admin"}</p>
        </header>
        <div className="flex-1 px-4 py-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
