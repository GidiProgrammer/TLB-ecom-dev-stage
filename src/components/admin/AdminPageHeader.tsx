import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function AdminPageStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex min-h-full flex-1 flex-col gap-3", className)}>{children}</div>;
}

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-950">{title}</h1>
        {description ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function AdminPanel({
  children,
  className,
  fill,
}: {
  children: ReactNode;
  className?: string;
  fill?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        fill && "flex min-h-[22rem] flex-1 flex-col",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminCardToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-4", className)}>
      {children}
    </div>
  );
}

export function AdminTable({ className, ...props }: ComponentProps<typeof Table>) {
  return (
    <Table
      className={cn(
        "[&_thead_tr]:border-transparent [&_thead_tr]:bg-[#f4f6fb] [&_thead_tr]:hover:bg-[#f4f6fb]",
        "[&_th]:h-12 [&_th]:px-5 [&_th]:text-xs [&_th]:font-medium [&_th]:text-neutral-400",
        "[&_td]:px-5 [&_td]:py-3.5 [&_td]:text-sm",
        "[&_tbody_tr]:border-neutral-100 [&_tbody_tr]:hover:bg-[#fafbfe]",
        "[&_tbody_tr[data-state=selected]]:bg-primary-soft",
        className,
      )}
      {...props}
    />
  );
}

export function AdminIdentity({ children, hint }: { children: ReactNode; hint?: string | undefined }) {
  return (
    <div className="min-w-0">
      <p className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">{children}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function AdminIconButton({
  label,
  className,
  children,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      {...props}
      className={cn("h-11 w-11 rounded-full bg-neutral-50 text-neutral-500 hover:bg-neutral-100 hover:text-foreground", className)}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

export function AdminEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-sm font-medium text-foreground">Nothing to show</p>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function AdminLoading({ label = "Loading" }: { label?: string }) {
  return (
    <AdminPanel className="p-5" aria-busy="true" aria-label={label}>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-10 w-full" />
      <Skeleton className="mt-2 h-10 w-full" />
      <Skeleton className="mt-2 h-10 w-3/4" />
    </AdminPanel>
  );
}

export function AdminSearch({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <label className="relative block w-full max-w-xs sm:max-w-sm">
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search"
        className="h-11 rounded-full border-neutral-200 bg-[#f7f8fc] py-1 pr-4 pl-10 shadow-none"
      />
    </label>
  );
}

export const ADMIN_PAGE_SIZE = 8;

export function useAdminPage<T>(items: T[], resetKey?: string) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / ADMIN_PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const slice = useMemo(() => {
    const startIndex = (page - 1) * ADMIN_PAGE_SIZE;
    return items.slice(startIndex, startIndex + ADMIN_PAGE_SIZE);
  }, [items, page]);

  const total = items.length;
  const start = total === 0 ? 0 : (page - 1) * ADMIN_PAGE_SIZE + 1;
  const end = Math.min(page * ADMIN_PAGE_SIZE, total);

  return { page, setPage, pageCount, slice, start, end, total };
}

function pageTokens(page: number, pageCount: number): Array<number | "gap"> {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const tokens = new Set([1, pageCount, page, page - 1, page + 1]);
  if (page <= 3) {
    tokens.add(2);
    tokens.add(3);
  }
  if (page >= pageCount - 2) {
    tokens.add(pageCount - 1);
    tokens.add(pageCount - 2);
  }
  const sorted = [...tokens].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const out: Array<number | "gap"> = [];
  for (const n of sorted) {
    const prev = out[out.length - 1];
    if (typeof prev === "number" && n - prev > 1) out.push("gap");
    out.push(n);
  }
  return out;
}

export function AdminPagination({
  page,
  pageCount,
  start,
  end,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  start: number;
  end: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (total === 0) return null;

  const tokens = pageTokens(page, pageCount);

  return (
    <div className="mt-auto flex shrink-0 flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {start} to {end} of {total} entries
      </p>
      <nav className="flex flex-wrap items-center gap-1.5" aria-label="Pagination">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full px-4 shadow-none"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Prev
        </Button>
        {tokens.map((token, index) =>
          token === "gap" ? (
            <span key={`gap-${index}`} className="px-1 text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={token}
              type="button"
              variant={token === page ? "default" : "outline"}
              className={cn(
                "h-11 min-w-11 rounded-full px-0 shadow-none",
              )}
              aria-current={token === page ? "page" : undefined}
              aria-label={`Page ${token}`}
              onClick={() => onPage(token)}
            >
              {token}
            </Button>
          ),
        )}
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full px-4 shadow-none"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </nav>
    </div>
  );
}

export function StorefrontLink() {
  return (
    <Link to="/shop" className="text-sm font-medium text-primary hover:underline">
      View catalogue
    </Link>
  );
}
