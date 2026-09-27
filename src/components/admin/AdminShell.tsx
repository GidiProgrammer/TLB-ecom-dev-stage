import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const navGroups = [
  { label: "Desk", items: nav.slice(0, 3) },
  { label: "Catalogue", items: nav.slice(3) },
];

const pageTitle: Record<string, string> = {
  "/admin": "Overview",
  "/admin/orders": "Orders",
  "/admin/quotes": "Quotes",
  "/admin/products": "Products",
  "/admin/categories": "Categories",
  "/admin/accounts": "Accounts",
};

const sidebarFocus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e8c45a] focus-visible:outline-offset-2";

function AdminNavItem({
  to,
  label,
  icon: Icon,
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
      activeOptions={{ exact: true }}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-2.5 rounded-lg border border-transparent px-1.5 text-sm font-medium text-white/70 transition-colors",
        sidebarFocus,
        active
          ? "border-[rgb(212_166_46/0.35)] bg-white/8 font-semibold text-white"
          : "hover:border-white/10 hover:bg-white/6 hover:text-white",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          active ? "bg-white/12 text-[#e8c45a]" : "bg-white/5 text-white/60",
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function BrandRow({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <Link
      to="/admin"
      activeOptions={{ exact: true }}
      onClick={onNavigate}
      className={cn("flex items-center gap-2 rounded-lg px-1 py-1", sidebarFocus)}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
        <BrandLogo className="h-5" decorative />
      </span>
      <span className="text-sm font-semibold tracking-wide text-[#e8c45a]">TLB</span>
    </Link>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Desk: true, Catalogue: true });

  return (
    <div className="flex h-full min-h-0 flex-col px-2.5 py-3">
      <div className="shrink-0 border-b border-white/10 pb-3">
        <BrandRow onNavigate={onNavigate} />
        <p className="mt-2 px-1 text-[10px] font-semibold tracking-[0.14em] text-white/55 uppercase">Enterprise</p>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-3" aria-label="Admin">
        {navGroups.map((group) => {
          const open = openGroups[group.label] ?? true;
          const panelId = `admin-nav-${group.label.toLowerCase()}`;
          return (
            <div key={group.label}>
              <button
                type="button"
                className="mb-1.5 flex min-h-11 w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-2 text-left hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e8c45a]"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !open }))}
              >
                <span className="text-[10px] font-semibold tracking-[0.09em] text-white/70 uppercase">{group.label}</span>
                <span className="flex items-center gap-1.5 text-white/50">
                  <span className="rounded-md bg-white/10 px-1.5 text-[10px] font-semibold tabular-nums">{group.items.length}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open ? "" : "-rotate-90")} aria-hidden />
                </span>
              </button>
              <div id={panelId} className="flex flex-col gap-1" hidden={!open}>
                {group.items.map((item) => (
                  <AdminNavItem key={item.to} {...item} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="shrink-0 rounded-xl border border-white/12 bg-white/8 px-3 py-2.5">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-[#e8c45a] uppercase">Staff desk</p>
        <p className="mt-1 text-xs leading-snug text-white/75">Orders, quotes, and the laboratory catalogue.</p>
      </div>
    </div>
  );
}

function StaffMenu() {
  const { signOut, user } = useAuth();
  const email = user?.email ?? "Staff";
  const fullName = typeof user?.user_metadata?.["full_name"] === "string" ? user.user_metadata["full_name"].trim() : "";
  const name = fullName || email.split("@")[0] || "Staff";
  const initial = name.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-11 max-w-[16rem] items-center gap-2 rounded-xl px-1.5 text-sm font-medium text-foreground hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-2"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
            {initial}
          </span>
          <span className="hidden truncate sm:inline">{name}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-56 border-[#ddd6fe] bg-white p-1 text-[#2a0d5c]"
      >
        <div className="border-b border-[#ede9fe] px-3 py-2.5">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-[#5c4a80]">{email}</p>
        </div>
        <DropdownMenuItem asChild className="min-h-11 cursor-pointer">
          <Link to="/">
            <Store />
            Storefront
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-11 cursor-pointer">
          <Link to="/account">
            <User />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-11 cursor-pointer"
          onSelect={() => {
            void signOut();
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const section = pageTitle[pathname] ?? "Admin";

  return (
    <div className="admin-app flex h-dvh w-full overflow-hidden">
      <aside className="admin-sidebar hidden w-48 shrink-0 flex-col overflow-hidden md:flex">
        <SidebarBody />
      </aside>

      <div id="admin-main" className="admin-main flex h-dvh min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="sticky top-0 z-20 shrink-0 px-3 pt-3 md:pr-3 md:pl-0">
          <header className="admin-topbar flex h-14 items-center gap-2 px-2 sm:gap-3 sm:px-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open navigation menu"
                  className="shrink-0 text-foreground md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="admin-sidebar h-dvh w-48 border-0 border-r-0 p-0 text-white sm:max-w-none"
                style={{ background: "linear-gradient(180deg, #6d28d9 0%, #4810a8 46%, #3d0f8a 100%)" }}
                aria-describedby={undefined}
              >
                <SheetTitle className="sr-only">Admin menu</SheetTitle>
                <SidebarBody onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-primary uppercase">TLB admin</p>
              <p className="truncate text-sm font-semibold text-foreground">{section}</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <Link
                to="/"
                className="hidden h-9 items-center gap-1.5 rounded-xl border border-primary/20 bg-white px-3 text-sm font-semibold text-primary shadow-sm hover:bg-primary-soft sm:inline-flex"
              >
                <Store className="h-4 w-4" aria-hidden />
                Storefront
              </Link>
              <StaffMenu />
            </div>
          </header>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-4 py-4 md:pr-5 md:pb-10 md:pl-2">{children}</div>
      </div>
    </div>
  );
}
