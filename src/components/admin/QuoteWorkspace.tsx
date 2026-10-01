import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { formatGHS } from "@/lib/catalog-utils";
import { Constants } from "@/integrations/supabase/types";
import { updateQuoteItemPrice, updateQuoteStatus } from "@/lib/admin-ops";
import type { AdminQuote } from "@/lib/queries/admin";
import { QuoteDetailSheet, QuoteLinePriceEditor, QuoteStatusControl } from "@/components/admin/QuoteDetailSheet";
import {
  AdminCardToolbar,
  AdminEmpty,
  AdminIconButton,
  AdminIdentity,
  AdminPagination,
  AdminPanel,
  AdminSearch,
  AdminTable,
  useAdminPage,
} from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const QUOTE_STATUSES = Constants.public.Enums.quote_status;

function mutationMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function QuoteWorkspace({ quotes }: { quotes: AdminQuote[] }) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return quotes;
    return quotes.filter(
      (quote) =>
        quote.reference.toLowerCase().includes(term) ||
        (quote.contact_name ?? "").toLowerCase().includes(term) ||
        quote.status.toLowerCase().includes(term),
    );
  }, [quotes, q]);
  const paging = useAdminPage(filtered, q);
  const openQuote = quotes.find((quote) => quote.id === openId) ?? null;

  const saveStatus = async (quote: AdminQuote, status: (typeof QUOTE_STATUSES)[number]) => {
    if (status === quote.status) return;
    setBusyId(quote.id);
    try {
      await updateQuoteStatus({ data: { quoteId: quote.id, status } });
      await queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      toast.success(`Quote ${quote.reference} updated`);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not update quote status"));
    } finally {
      setBusyId(null);
    }
  };

  const savePrice = async (quote: AdminQuote, quoteItemId: string, quotedPrice: number) => {
    setBusyId(quote.id);
    try {
      await updateQuoteItemPrice({ data: { quoteItemId, quotedPrice } });
      await queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      toast.success(`Price saved for ${quote.reference}`);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not update quoted price"));
    } finally {
      setBusyId(null);
    }
  };

  if (quotes.length === 0) {
    return (
      <AdminPanel fill>
        <AdminEmpty>No quote requests yet.</AdminEmpty>
      </AdminPanel>
    );
  }

  return (
    <>
      <AdminPanel fill>
        <AdminCardToolbar className="items-start">
          <div className="w-full space-y-3">
            <p className="text-xs text-muted-foreground">
              Accepted means the customer agreed to the quoted prices. It is not an order, payment, or
              warehouse instruction.
            </p>
            <AdminSearch value={q} onChange={setQ} label="Search quotes" />
          </div>
        </AdminCardToolbar>
        {filtered.length === 0 ? (
          <AdminEmpty>No quotes match that search.</AdminEmpty>
        ) : (
          <AdminTable>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="hidden sm:table-cell">Contact</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Lines</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paging.slice.map((quote) => (
                <QuoteRow
                  key={quote.id}
                  quote={quote}
                  expanded={expandedId === quote.id}
                  selected={openId === quote.id}
                  busy={busyId === quote.id}
                  onToggle={() => setExpandedId((id) => (id === quote.id ? null : quote.id))}
                  onOpen={() => setOpenId(quote.id)}
                  onStatus={(status) => void saveStatus(quote, status)}
                  onSavePrice={(quoteItemId, quotedPrice) => void savePrice(quote, quoteItemId, quotedPrice)}
                />
              ))}
            </TableBody>
          </AdminTable>
        )}
        {filtered.length === 0 ? null : (
          <AdminPagination
            page={paging.page}
            pageCount={paging.pageCount}
            start={paging.start}
            end={paging.end}
            total={paging.total}
            onPage={paging.setPage}
          />
        )}
      </AdminPanel>
      <QuoteDetailSheet
        quote={openQuote}
        busy={openQuote != null && busyId === openQuote.id}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
        onStatus={(status) => {
          if (openQuote) void saveStatus(openQuote, status);
        }}
        onSavePrice={(quoteItemId, quotedPrice) => {
          if (openQuote) void savePrice(openQuote, quoteItemId, quotedPrice);
        }}
      />
    </>
  );
}

function QuoteRow({
  quote,
  expanded,
  selected,
  busy,
  onToggle,
  onOpen,
  onStatus,
  onSavePrice,
}: {
  quote: AdminQuote;
  expanded: boolean;
  selected: boolean;
  busy: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onStatus: (status: (typeof QUOTE_STATUSES)[number]) => void;
  onSavePrice: (quoteItemId: string, quotedPrice: number) => void;
}) {
  return (
    <>
      <TableRow data-state={selected ? "selected" : undefined}>
        <TableCell>
          <button
            type="button"
            className="min-w-0 rounded-[8px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#523784]"
            aria-haspopup="dialog"
            aria-expanded={selected}
            aria-label={`Open quote ${quote.reference}`}
            onClick={onOpen}
          >
            <AdminIdentity hint={quote.contact_name ?? undefined}>{quote.reference}</AdminIdentity>
          </button>
        </TableCell>
        <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
          {new Date(quote.created_at).toLocaleString("en-GB")}
        </TableCell>
        <TableCell className="hidden sm:table-cell">{quote.contact_name ?? "—"}</TableCell>
        <TableCell className="text-right tabular-nums">{quote.quote_items.length}</TableCell>
        <TableCell>
          <QuoteStatusControl
            reference={quote.reference}
            status={quote.status}
            busy={busy}
            onStatus={onStatus}
            triggerClassName="h-11 min-h-11 w-36 rounded-[8px] text-xs"
            ariaLabel={`Status for ${quote.reference}`}
          />
        </TableCell>
        <TableCell className="text-center">
          <AdminIconButton
            label={expanded ? `Hide items for ${quote.reference}` : `Edit prices for ${quote.reference}`}
            aria-expanded={expanded}
            onClick={onToggle}
          >
            <Pencil />
          </AdminIconButton>
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow>
          <TableCell colSpan={6} className="bg-admin-table">
            <ul className="space-y-2 px-1 py-2">
              {quote.quote_items.map((item) => (
                <li key={item.id} className="rounded-lg bg-card px-3 py-2">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="min-w-0 flex-1 text-sm font-medium break-words">{item.product_name}</span>
                    <span className="text-sm text-muted-foreground">× {item.quantity}</span>
                    {item.quoted_price != null ? (
                      <span className="text-sm tabular-nums">{formatGHS(Number(item.quoted_price))}</span>
                    ) : (
                      <StatusBadge tone="warning">Pending</StatusBadge>
                    )}
                    <QuoteLinePriceEditor
                      key={`${item.id}:${item.quoted_price ?? "unset"}`}
                      item={item}
                      quoteStatus={quote.status}
                      busy={busy}
                      onSave={(quotedPrice) => onSavePrice(item.id, quotedPrice)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
