import { useState } from "react";
import { toast } from "sonner";
import { interpretLineQuantity } from "@/lib/line-quantity";
import { Input } from "@/components/ui/input";

export function LineQuantityInput({
  label,
  value,
  max,
  onCommit,
  className = "w-20",
}: {
  label: string;
  value: number;
  max?: number;
  onCommit: (quantity: number) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <Input
      type="number"
      min={1}
      max={max}
      step={1}
      inputMode="numeric"
      aria-label={label}
      value={draft ?? String(value)}
      onChange={(event) => {
        const raw = event.target.value;
        const result = interpretLineQuantity(raw, value, max);
        if (result.status === "too-high") {
          setDraft(raw);
          toast.error("That quantity is more than current stock", {
            description: max != null ? `Reduce to ${max} or fewer.` : undefined,
          });
          return;
        }
        if (result.status === "update") {
          setDraft(null);
          onCommit(result.quantity);
          return;
        }
        setDraft(raw);
      }}
      onBlur={() => setDraft(null)}
      className={className}
    />
  );
}
