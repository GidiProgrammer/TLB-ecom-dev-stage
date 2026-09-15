import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatGHS } from "@/lib/catalog-utils";
import { Constants } from "@/integrations/supabase/types";
import {
  allowedOrderTransitions,
  isOrderCancellable,
  isTerminalOrderStatus,
} from "@/lib/commerce-status";
import { cancelOrder, updateOrderStatus } from "@/lib/admin-ops";
import type { AdminOrder } from "@/lib/queries/admin";
import { AdminEmpty, AdminPanel, AdminSearch } from "@/components/admin/AdminPageHeader";
import { StatusBadge, orderStatusTone } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ORDER_STATUSES = Constants.public.Enums.order_status;

function mutationMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function OrderWorkspace({ orders, compact }: { orders: AdminOrder[]; compact?: boolean }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term
      ? orders.filter(
          (o) =>
            o.reference.toLowerCase().includes(term) ||
            (o.shipping_name ?? "").toLowerCase().includes(term) ||
            o.status.toLowerCase().includes(term),
        )
      : orders;
    return compact ? list.slice(0, 8) : list;
  }, [orders, q, compact]);

  if (orders.length === 0) {
    return (
      <AdminPanel>
        <AdminEmpty>No orders yet.</AdminEmpty>
      </AdminPanel>
    );
  }

  return (
    <AdminPanel>
      {compact ? null : (
        <div className="border-b border-border px-4 py-3">
          <AdminSearch value={q} onChange={setQ} label="Search orders" />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
            <TableHead className="hidden sm:table-cell">Customer</TableHead>
            <TableHead className="text-right">Lines</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            {compact ? null : <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((order) => (
            <OrderRow key={order.id} order={order} compact={Boolean(compact)} />
          ))}
        </TableBody>
      </Table>
    </AdminPanel>
  );
}

function OrderRow({ order, compact = false }: { order: AdminOrder; compact?: boolean }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const nextStatuses = allowedOrderTransitions(order.status);
  const terminal = isTerminalOrderStatus(order.status);
  const cancellable = isOrderCancellable(order.status);

  const saveStatus = async (status: (typeof ORDER_STATUSES)[number]) => {
    if (status === order.status) return;
    setBusy(true);
    try {
      await updateOrderStatus({ data: { orderId: order.id, status } });
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success(`Order ${order.reference} updated`);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not update order status"));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await cancelOrder({ data: { orderId: order.id } });
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success(`Order ${order.reference} cancelled`);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not cancel order"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{order.reference}</TableCell>
      <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
        {new Date(order.created_at).toLocaleString("en-GB")}
      </TableCell>
      <TableCell className="hidden sm:table-cell">{order.shipping_name ?? "—"}</TableCell>
      <TableCell className="text-right tabular-nums">{order.order_items.length}</TableCell>
      <TableCell className="text-right tabular-nums">{formatGHS(Number(order.total))}</TableCell>
      <TableCell>
        {terminal || compact ? (
          <StatusBadge tone={orderStatusTone(order.status)}>{order.status}</StatusBadge>
        ) : (
          <Select
            value={order.status}
            onValueChange={(value) => void saveStatus(value as (typeof ORDER_STATUSES)[number])}
            disabled={busy || nextStatuses.length === 0}
          >
            <SelectTrigger className="h-9 min-h-9 w-40 text-xs" aria-label={`Status for ${order.reference}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={order.status} className="capitalize">
                {order.status.replaceAll("_", " ")}
              </SelectItem>
              {nextStatuses.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">
                  {status.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </TableCell>
      {compact ? null : (
        <TableCell className="text-right">
          {cancellable ? (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void cancel()}>
              Cancel order
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
