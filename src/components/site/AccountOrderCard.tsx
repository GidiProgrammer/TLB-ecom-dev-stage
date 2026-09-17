import { useEffect, useRef, useState } from "react";
import {
  orderStatusExplanation,
  orderStatusLabel,
} from "@/lib/account-display";
import { formatGHS } from "@/lib/catalog-utils";
import type { AccountOrder } from "@/lib/queries/account";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AccountOrderCard({
  order,
  highlighted = false,
  forceOpen = false,
}: {
  order: AccountOrder;
  highlighted?: boolean;
  forceOpen?: boolean;
}) {
  const articleRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(Boolean(highlighted || forceOpen));
  const shippingBits = [order.shipping_name, order.shipping_address, order.shipping_city].filter(Boolean);
  const status = orderStatusLabel(order.status);
  const explanation = orderStatusExplanation(order.status);

  useEffect(() => {
    if (highlighted || forceOpen) setOpen(true);
  }, [highlighted, forceOpen]);

  useEffect(() => {
    if (!highlighted || !articleRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    articleRef.current.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [highlighted]);

  const body = (
    <div className="space-y-3 text-sm">
      {order.institution ? <p className="text-muted-foreground">Institution: {order.institution}</p> : null}
      {shippingBits.length ? (
        <p>
          <span className="font-medium">Delivery contact</span>
          <span className="mt-1 block text-muted-foreground">{shippingBits.join(", ")}</span>
          {order.shipping_phone ? (
            <span className="block text-muted-foreground">{order.shipping_phone}</span>
          ) : null}
          {order.shipping_email ? (
            <span className="block text-muted-foreground">{order.shipping_email}</span>
          ) : null}
        </p>
      ) : null}
      {order.order_items.length > 0 ? (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {order.order_items.map((item) => (
            <li key={item.id}>
              {item.quantity} × {item.product_name} · {formatGHS(Number(item.unit_price))} ·{" "}
              {formatGHS(Number(item.line_total))}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No line items on this order.</p>
      )}
      <p className="font-display text-sm font-bold text-primary">
        Order total {formatGHS(Number(order.total))}
      </p>
    </div>
  );

  return (
    <article
      ref={articleRef}
      id={`order-${order.reference}`}
      aria-current={highlighted ? "true" : undefined}
      className={cn("rounded-lg p-4", highlighted ? "border-l-4 border-l-primary bg-muted/40" : "")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold">{order.reference}</h3>
          <p className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString("en-GB")} · {order.order_items.length}{" "}
            {order.order_items.length === 1 ? "line item" : "line items"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{status}</Badge>
          <span className="font-display text-sm font-bold text-primary">{formatGHS(Number(order.total))}</span>
        </div>
      </div>
      {highlighted ? (
        <p className="mt-2 text-xs font-medium text-foreground">Currently viewing this order</p>
      ) : null}
      {explanation ? <p className="mt-2 text-xs text-muted-foreground">{explanation}</p> : null}
      {forceOpen ? (
        <div className="mt-3">{body}</div>
      ) : (
        <details
          className="mt-3"
          open={open}
          onToggle={(event) => setOpen(event.currentTarget.open)}
        >
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary">
            Order details
          </summary>
          <div className="mt-3">{body}</div>
        </details>
      )}
    </article>
  );
}
