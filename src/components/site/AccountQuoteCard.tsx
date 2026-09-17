import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  quoteLineEstimate,
  quoteQuotedTotal,
  quoteStatusExplanation,
  quoteStatusLabel,
} from "@/lib/account-display";
import { formatGHS } from "@/lib/catalog-utils";
import { isQuoteCustomerAcceptable } from "@/lib/commerce-status";
import { acceptQuote } from "@/lib/quotes";
import type { AccountQuote } from "@/lib/queries/account";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AccountQuoteCard({
  quote,
  highlighted = false,
  forceOpen = false,
}: {
  quote: AccountQuote;
  highlighted?: boolean;
  forceOpen?: boolean;
}) {
  const articleRef = useRef<HTMLElement>(null);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(Boolean(highlighted || forceOpen));
  const contactBits = [quote.contact_name, quote.contact_email, quote.contact_phone].filter(Boolean);
  const canAccept = isQuoteCustomerAcceptable(quote.status);
  const quotedTotal = quoteQuotedTotal(quote.quote_items);
  const status = quoteStatusLabel(quote.status);
  const explanation = quoteStatusExplanation(quote.status);

  useEffect(() => {
    if (highlighted || forceOpen) setOpen(true);
  }, [highlighted, forceOpen]);

  useEffect(() => {
    if (!highlighted || !articleRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    articleRef.current.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [highlighted]);

  const accept = async () => {
    setBusy(true);
    try {
      await acceptQuote({ data: { quoteId: quote.id } });
      await queryClient.invalidateQueries({ queryKey: ["account-quotes"] });
      toast.success(`Quotation ${quote.reference} accepted`, {
        description: "Acceptance does not create an order. Contact TLB for the next business step.",
      });
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "Could not accept quotation";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <div className="space-y-3 text-sm">
      {quote.institution ? <p className="text-muted-foreground">Institution: {quote.institution}</p> : null}
      {contactBits.length ? (
        <p>
          <span className="font-medium">Contact</span>
          <span className="mt-1 block text-muted-foreground">{contactBits.join(" · ")}</span>
        </p>
      ) : null}
      {quote.notes ? <p className="text-muted-foreground">{quote.notes}</p> : null}
      <p className="text-xs text-muted-foreground">
        Quoted amounts are estimates from our team. They are not an invoice and are not a checkout total.
      </p>
      {quote.quote_items.length > 0 ? (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {quote.quote_items.map((item) => {
            const line = quoteLineEstimate(item.quantity, item.quoted_price);
            return (
              <li key={item.id}>
                {item.quantity} × {item.product_name} ·{" "}
                {item.quoted_price == null
                  ? "Price not yet provided"
                  : `${formatGHS(Number(item.quoted_price))} quoted unit price`}
                {line != null ? ` · ${formatGHS(line)} estimated line total` : ""}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No items on this quote request.</p>
      )}
      {quotedTotal != null ? (
        <p className="font-display text-sm font-bold text-primary">
          Quoted total (estimate) {formatGHS(quotedTotal)}
        </p>
      ) : quote.quote_items.length > 0 ? (
        <p className="text-xs text-muted-foreground">Quoted pricing is still pending on one or more items.</p>
      ) : null}
    </div>
  );

  return (
    <article
      ref={articleRef}
      id={`quote-${quote.reference}`}
      aria-current={highlighted ? "true" : undefined}
      className={cn("rounded-lg p-4", highlighted ? "border-l-4 border-l-primary bg-muted/40" : "")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold">{quote.reference}</h3>
          <p className="text-xs text-muted-foreground">
            {new Date(quote.created_at).toLocaleDateString("en-GB")} · {quote.quote_items.length}{" "}
            {quote.quote_items.length === 1 ? "item" : "items"}
          </p>
        </div>
        <Badge variant="secondary">{status}</Badge>
      </div>
      {highlighted ? (
        <p className="mt-2 text-xs font-medium text-foreground">Currently viewing this quote request</p>
      ) : null}
      {explanation ? <p className="mt-2 text-xs text-muted-foreground">{explanation}</p> : null}
      {quote.status === "accepted" ? (
        <div className="mt-3 space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
          <p className="text-xs text-muted-foreground">
            This quotation has been accepted. Acceptance does not create an order or reserve stock. Contact
            TLB for the next business step.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="min-h-11">
              <Link to="/contact">Contact TLB</Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="min-h-11">
              <Link to="/account">View account</Link>
            </Button>
          </div>
        </div>
      ) : null}
      {canAccept ? (
        <div className="mt-3 space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
          <p className="text-xs text-muted-foreground">
            Accepting confirms that you agree to the quoted prices. It does not create an order or process
            payment.
          </p>
          <Button type="button" size="sm" className="min-h-11" disabled={busy} onClick={() => void accept()}>
            {busy ? "Accepting…" : "Accept quotation"}
          </Button>
        </div>
      ) : null}
      {forceOpen ? (
        <div className="mt-3">{body}</div>
      ) : (
        <details className="mt-3" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary">
            Quote details
          </summary>
          <div className="mt-3">{body}</div>
        </details>
      )}
    </article>
  );
}
