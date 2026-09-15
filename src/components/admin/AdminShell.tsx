import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  FileText,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Store,
  User,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/site/BrandLogo";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav: {
  to: "/admin" | "/admin/orders" | "/admin/quotes" | "/admin/products" | "/admin/categories" | "/admin/accounts";
  label: string;
  exact?: boolean;
  icon: LucideIcon;
}[] = [
  { to: "/admin", label: "Overview", exact: true, icon: LayoutDashboard },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/quotes", label: "Quotes", icon: FileText },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: Layers },
  { to: "/admin/accounts", label: "Accounts", icon: Users },
];

const navItemClass =
  "flex min-h-11 items-center gap-3 rounded-full px-2 pr-3 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-purple";

function IconTile({ icon: Icon, active }: { icon: LucideIcon; active?: boolean }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
        active ? "border-white/25 bg-white/10 text-white" : "border-white/15 bg-transparent text-white/70",
      )}
      aria-hidden
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

function AdminNavItem({
  to,
  label,
  icon,
  exact,
  onNavigate,
}: {
  to: (typeof nav)[number]["to"];
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  onNavigate?: (() => void) | undefined;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = exact ? pathname === to : pathname === to;

  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        navItemClass,
        active ? "bg-primary text-white shadow-sm" : "text-white/70 hover:bg-white/8 hover:text-white",
      )}
    >
      <IconTile icon={icon} active={active} />
      {label}
    </Link>
  );
}

function BrandRow({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <Link
      to="/admin"
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-purple"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
        <BrandLogo className="h-6" decorative />
      </span>
      <span className="text-sm font-semibold text-white">TLB Enterprise</span>
    </Link>
  );
}

function AdminNav({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Admin">
      {nav.map((item) => (
        <AdminNavItem key={item.to} {...item} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

function FooterLink({
  to,
  icon,
  children,
  onNavigate,
}: {
  to: "/" | "/account";
  icon: LucideIcon;
  children: string;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex min-h-11 items-center gap-2 rounded-full px-1 text-xs font-medium text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      <IconTile icon={icon} />
      {children}
    </Link>
  );
}

function AdminSidebarFooter({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { signOut, user } = useAuth();
  const email = user?.email ?? "Staff";

  return (
    <div className="shrink-0 rounded-2xl bg-white/6 p-2">
      <p className="truncate px-2 py-1.5 text-sm font-medium text-white" title={email}>
        {email}
      </p>
      <div className="space-y-0.5">
        <FooterLink to="/" icon={Store} onNavigate={onNavigate}>
          Storefront
        </FooterLink>
        <FooterLink to="/account" icon={User} onNavigate={onNavigate}>
          Account
        </FooterLink>
        <button
          type="button"
          className="flex min-h-11 w-full items-center gap-2 rounded-full px-1 text-left text-xs font-medium text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          onClick={() => {
            onNavigate?.();
            void signOut();
          }}
        >
          <IconTile icon={LogOut} />
          Sign out
        </button>
      </div>
    </div>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <div className="flex h-full min-h-0 flex-col px-3 py-4">
      <div className="shrink-0 pb-4">
        <BrandRow onNavigate={onNavigate} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        <AdminNav onNavigate={onNavigate} />
      </div>
      <AdminSidebarFooter onNavigate={onNavigate} />
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[#e8eaf2] p-1.5 lg:p-2">
      <div className="flex h-[calc(100dvh-0.75rem)] overflow-hidden rounded-[1.25rem] bg-[#e8eaf2] lg:h-[calc(100dvh-1rem)]">
        <aside className="m-1.5 hidden w-60 shrink-0 overflow-hidden rounded-2xl bg-deep-purple lg:flex lg:flex-col">
          <SidebarBody />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden py-2 pr-2 pl-2 lg:pl-0">
          <header className="flex shrink-0 items-center gap-3 pb-3 lg:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full" aria-label="Open admin menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="h-dvh w-72 border-0 bg-deep-purple p-0 text-white shadow-lg sm:rounded-r-2xl"
                aria-describedby={undefined}
              >
                <SheetTitle className="sr-only">Admin menu</SheetTitle>
                <div className="h-full">
                  <SidebarBody onNavigate={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
