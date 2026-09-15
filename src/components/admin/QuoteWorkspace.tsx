import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { formatGHS } from "@/lib/catalog-utils";
import { Constants } from "@/integrations/supabase/types";
import { allowedQuoteTransitions, isTerminalQuoteStatus } from "@/lib/commerce-status";
import { updateQuoteItemPrice, updateQuoteStatus } from "@/lib/admin-ops";
import type { AdminQuote } from "@/lib/queries/admin";
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
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
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

  if (quotes.length === 0) {
    return (
      <AdminPanel fill>
        <AdminEmpty>No quote requests yet.</AdminEmpty>
      </AdminPanel>
    );
  }

  return (
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
              expanded={openId === quote.id}
              onToggle={() => setOpenId((id) => (id === quote.id ? null : quote.id))}
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
  );
}

function QuoteRow({
  quote,
  expanded,
  onToggle,
}: {
  quote: AdminQuote;
  expanded: boolean;
  onToggle: () => void;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const nextStatuses = allowedQuoteTransitions(quote.status);
  const terminal = isTerminalQuoteStatus(quote.status);

  const saveStatus = async (status: (typeof QUOTE_STATUSES)[number]) => {
    if (status === quote.status) return;
    setBusy(true);
    try {
      await updateQuoteStatus({ data: { quoteId: quote.id, status } });
      await queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      toast.success(`Quote ${quote.reference} updated`);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not update quote status"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TableRow>
        <TableCell>
          <AdminIdentity hint={quote.contact_name ?? undefined}>{quote.reference}</AdminIdentity>
        </TableCell>
        <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
          {new Date(quote.created_at).toLocaleString("en-GB")}
        </TableCell>
        <TableCell className="hidden sm:table-cell">{quote.contact_name ?? "—"}</TableCell>
        <TableCell className="text-right tabular-nums">{quote.quote_items.length}</TableCell>
        <TableCell>
          {terminal ? (
            <StatusBadge tone={quoteStatusTone(quote.status)}>{quote.status}</StatusBadge>
          ) : (
            <Select
              value={quote.status}
              onValueChange={(value) => void saveStatus(value as (typeof QUOTE_STATUSES)[number])}
              disabled={busy || nextStatuses.length === 0}
            >
              <SelectTrigger className="h-11 min-h-11 w-36 text-xs" aria-label={`Status for ${quote.reference}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={quote.status} className="capitalize">
                  {quote.status}
                </SelectItem>
                {nextStatuses.map((status) => (
                  <SelectItem key={status} value={status} className="capitalize">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
          <TableCell colSpan={6} className="bg-neutral-50">
            <ul className="space-y-2 px-1 py-2">
              {quote.quote_items.map((item) => (
                <QuoteItemPriceRow
                  key={item.id}
                  item={item}
                  quoteReference={quote.reference}
                  quoteStatus={quote.status}
                />
              ))}
            </ul>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function QuoteItemPriceRow({
  item,
  quoteReference,
  quoteStatus,
}: {
  item: AdminQuote["quote_items"][number];
  quoteReference: string;
  quoteStatus: AdminQuote["status"];
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(item.quoted_price == null ? "" : String(item.quoted_price));
  const [busy, setBusy] = useState(false);
  const closed = isTerminalQuoteStatus(quoteStatus);

  const save = async () => {
    const parsed = Number(value);
    setBusy(true);
    try {
      await updateQuoteItemPrice({ data: { quoteItemId: item.id, quotedPrice: parsed } });
      await queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      toast.success(`Price saved for ${quoteReference}`);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not update quoted price"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg bg-card px-3 py-2 text-sm">
      <span className="min-w-0 flex-1 font-medium">{item.product_name}</span>
      <span className="text-muted-foreground">× {item.quantity}</span>
      {item.quoted_price != null ? (
        <span className="tabular-nums">{formatGHS(Number(item.quoted_price))}</span>
      ) : (
        <StatusBadge tone="warning">Pending</StatusBadge>
      )}
      <Input
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        aria-label={`Quoted price for ${item.product_name}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={closed || busy}
        className="h-11 min-h-11 w-28 text-right tabular-nums"
      />
      <Button size="sm" variant="ghost" disabled={closed || busy} onClick={() => void save()}>
        Save price
      </Button>
    </li>
  );
}
