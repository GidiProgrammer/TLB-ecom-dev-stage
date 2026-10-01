import { useState } from "react";
import { formatGHS } from "@/lib/catalog-utils";
import {
  allowedQuoteTransitions,
  isTerminalQuoteStatus,
  type QuoteStatus,
} from "@/lib/commerce-status";
import { quoteDetailModel } from "@/lib/admin-detail";
import type { AdminQuote } from "@/lib/queries/admin";
import { formatStaffTimestamp } from "@/components/admin/OrderDetailSheet";
import { DetailFacts, DetailSection, StaffDetailSheet } from "@/components/admin/StaffDetailSheet";
import { StatusBadge, quoteStatusTone } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function QuoteStatusControl({
  reference,
  status,
  busy,
  onStatus,
  triggerClassName,
  ariaLabel,
}: {
  reference: string;
  status: QuoteStatus;
  busy: boolean;
  onStatus: (status: QuoteStatus) => void;
  triggerClassName?: string;
  ariaLabel?: string;
}) {
  const nextStatuses = allowedQuoteTransitions(status);
  if (isTerminalQuoteStatus(status)) {
    return <StatusBadge tone={quoteStatusTone(status)}>{status}</StatusBadge>;
  }
  return (
    <Select
      value={status}
      onValueChange={(value) => onStatus(value as QuoteStatus)}
      disabled={busy || nextStatuses.length === 0}
    >
      <SelectTrigger
        className={triggerClassName ?? "h-11 min-h-11 w-full rounded-[8px] text-xs sm:w-40"}
        aria-label={ariaLabel ?? `Quote status for ${reference}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={status} className="capitalize">
          {status}
        </SelectItem>
        {nextStatuses.map((next) => (
          <SelectItem key={next} value={next} className="capitalize">
            {next}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function QuoteLinePriceEditor({
  item,
  quoteStatus,
  busy,
  onSave,
}: {
  item: AdminQuote["quote_items"][number];
  quoteStatus: QuoteStatus;
  busy: boolean;
  onSave: (quotedPrice: number) => void;
}) {
  const [value, setValue] = useState(item.quoted_price == null ? "" : String(item.quoted_price));
  const closed = isTerminalQuoteStatus(quoteStatus);

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        aria-label={`Quoted price for ${item.product_name}`}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={closed || busy}
        className="h-11 min-h-11 w-full rounded-[8px] text-right tabular-nums sm:w-28"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-11 min-h-11 rounded-[8px]"
        disabled={closed || busy}
        onClick={() => onSave(Number(value))}
      >
        Save price
      </Button>
    </div>
  );
}

export function QuoteDetailSheet({
  quote,
  busy,
  onOpenChange,
  onStatus,
  onSavePrice,
}: {
  quote: AdminQuote | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onStatus: (status: QuoteStatus) => void;
  onSavePrice: (quoteItemId: string, quotedPrice: number) => void;
}) {
  const model = quote ? quoteDetailModel(quote) : null;

  return (
    <StaffDetailSheet
      open={quote != null}
      onOpenChange={onOpenChange}
      eyebrow="Quote"
      title={model?.reference ?? "Quote"}
      description={
        model
          ? `Created ${formatStaffTimestamp(model.createdAt)}. Last updated ${formatStaffTimestamp(model.updatedAt)}.`
          : "Quote details"
      }
      meta={model ? <StatusBadge tone={quoteStatusTone(model.status)}>{model.status}</StatusBadge> : null}
      footer={
        model && quote ? (
          <QuoteStatusControl
            reference={model.reference}
            status={quote.status}
            busy={busy}
            onStatus={onStatus}
          />
        ) : null
      }
    >
      {model && quote ? (
        <>
          <DetailSection title="Requester">
            <DetailFacts rows={model.requester} empty="No contact details were stored with this quote." />
          </DetailSection>
          {model.notes ? (
            <DetailSection title="Notes">
              <p className="text-sm leading-relaxed break-words text-[#18161d]">{model.notes}</p>
            </DetailSection>
          ) : null}
          <DetailSection title="Requested products">
            {model.lines.length === 0 ? (
              <p className="text-sm text-[#55515f]">No products were stored on this quote.</p>
            ) : (
              <ul className="divide-y divide-[#e4e1ea] border-y border-[#e4e1ea]">
                {model.lines.map((line) => {
                  const item = quote.quote_items.find((entry) => entry.id === line.id);
                  if (!item) return null;
                  return (
                    <li key={line.id} className="space-y-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold break-words text-[#18161d]">{line.productName}</p>
                        <p className="mt-1 text-sm text-[#55515f]">
                          Quantity <span className="font-medium text-[#18161d] tabular-nums">{line.quantity}</span>
                        </p>
                        <p className="mt-1 text-sm text-[#55515f]">
                          Quoted unit price{" "}
                          {line.quotedPrice == null ? (
                            <span className="font-medium text-[#18161d]">Not set</span>
                          ) : (
                            <span className="font-medium text-[#18161d] tabular-nums">
                              {formatGHS(line.quotedPrice)}
                            </span>
                          )}
                        </p>
                        {line.lineEstimate != null ? (
                          <p className="mt-1 text-sm text-[#55515f]">
                            Line estimate{" "}
                            <span className="font-medium text-[#523784] tabular-nums">
                              {formatGHS(line.lineEstimate)}
                            </span>
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-[#55515f]">Line estimate is not available until a price is set.</p>
                        )}
                      </div>
                      <QuoteLinePriceEditor
                        key={`${item.id}:${item.quoted_price ?? "unset"}`}
                        item={item}
                        quoteStatus={quote.status}
                        busy={busy}
                        onSave={(quotedPrice) => onSavePrice(item.id, quotedPrice)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </DetailSection>
          <DetailSection title="Summary">
            {model.lines.length === 0 ? (
              <p className="text-sm text-[#55515f]">No quoted total.</p>
            ) : model.incomplete || model.total == null ? (
              <p className="text-sm leading-relaxed text-[#18161d]">
                Quoted total is incomplete until every requested product has a price.
              </p>
            ) : (
              <dl className="border-y border-[#e4e1ea] py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-sm font-semibold text-[#18161d]">Quoted total</dt>
                  <dd className="text-base font-semibold text-[#523784] tabular-nums">{formatGHS(model.total)}</dd>
                </div>
              </dl>
            )}
          </DetailSection>
        </>
      ) : null}
    </StaffDetailSheet>
  );
}
