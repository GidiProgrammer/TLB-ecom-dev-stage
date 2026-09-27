import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary-soft text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
} as const;

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-current/20",
        tones[tone],
      )}
    >
      {children.replaceAll("_", " ")}
    </span>
  );
}

export function orderStatusTone(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "cancelled" || status === "payment_failed") return "danger" as const;
  if (status === "pending") return "warning" as const;
  return "primary" as const;
}

export function quoteStatusTone(status: string) {
  if (status === "accepted") return "success" as const;
  if (status === "declined") return "danger" as const;
  if (status === "quoted") return "primary" as const;
  return "warning" as const;
}

export function approvalTone(status: string) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  return "warning" as const;
}

export function catalogStatusTone(status: string) {
  if (status === "Active") return "success" as const;
  if (status === "Deleted") return "danger" as const;
  return "neutral" as const;
}
