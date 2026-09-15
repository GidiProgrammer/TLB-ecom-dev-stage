import { Link } from "@tanstack/react-router";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function AdminPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[12px] border border-border bg-card shadow-card ${className ?? ""}`}>
      {children}
    </div>
  );
}

export function AdminEmpty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{children}</p>;
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
    <label className="block max-w-sm">
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className="h-9 w-full rounded-[8px] border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

export function StorefrontLink() {
  return (
    <Link to="/shop" className="text-sm font-medium text-primary hover:underline">
      View catalogue
    </Link>
  );
}
