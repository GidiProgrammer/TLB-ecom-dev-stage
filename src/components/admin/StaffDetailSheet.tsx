import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function StaffDetailSheet({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  meta,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow: string;
  title: string;
  description: string;
  meta?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex h-dvh w-full max-w-none flex-col gap-0 overflow-hidden border-l border-[#e4e1ea] bg-white p-0 text-[#18161d] shadow-pop",
          "sm:w-[32rem] sm:max-w-[32rem]",
          "[&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-[8px] [&>button]:opacity-100",
          "[&>button]:text-[#38245D] [&>button]:focus-visible:outline [&>button]:focus-visible:outline-2 [&>button]:focus-visible:outline-offset-2 [&>button]:focus-visible:outline-[#523784]",
        )}
      >
        <div className="shrink-0 border-b border-[#e4e1ea] px-5 pt-5 pr-16 pb-4">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#523784] uppercase">{eyebrow}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <SheetTitle className="text-xl font-semibold tracking-tight text-[#18161d]">{title}</SheetTitle>
            {meta}
          </div>
          <SheetDescription className="mt-2 text-sm leading-relaxed text-[#55515f]">{description}</SheetDescription>
          <div className="mt-4 h-0.5 w-10 rounded-full bg-[#F9CD5B]" aria-hidden="true" />
        </div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-[#e4e1ea] bg-white px-5 py-4">{footer}</div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = `staff-detail-${title.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <section className="mt-6 first:mt-0" aria-labelledby={headingId}>
      <h3 id={headingId} className="text-[11px] font-semibold tracking-[0.12em] text-[#38245D] uppercase">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function DetailFacts({ rows, empty }: { rows: { label: string; value: string }[]; empty: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-[#55515f]">{empty}</p>;
  }
  return (
    <dl className="divide-y divide-[#e4e1ea] border-y border-[#e4e1ea]">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-1 gap-0.5 py-2.5 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-3">
          <dt className="text-xs font-medium text-[#55515f]">{row.label}</dt>
          <dd className="min-w-0 text-sm break-words text-[#18161d]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
