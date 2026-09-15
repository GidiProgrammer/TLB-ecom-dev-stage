import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatGHS, productImage } from "@/lib/catalog-utils";
import { listAdminProducts } from "@/lib/catalog-ops";
import { Constants } from "@/integrations/supabase/types";
import {
  allowedOrderTransitions,
  isOrderCancellable,
  isTerminalOrderStatus,
} from "@/lib/commerce-status";
import { cancelOrder, updateOrderStatus } from "@/lib/admin-ops";
import type { AdminOrder } from "@/lib/queries/admin";
import {
  AdminCardToolbar,
  AdminEmpty,
  AdminIdentity,
  AdminPagination,
  AdminPanel,
  AdminSearch,
  AdminTable,
  useAdminPage,
} from "@/components/admin/AdminPageHeader";
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
  const catalogue = useQuery({ queryKey: ["admin-catalogue"], queryFn: () => listAdminProducts() });
  const productById = useMemo(
    () => new Map((catalogue.data ?? []).map((product) => [product.id, product])),
    [catalogue.data],
  );
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term
      ? orders.filter(
          (o) =>
            o.reference.toLowerCase().includes(term) ||
            (o.shipping_name ?? "").toLowerCase().includes(term) ||
            o.status.toLowerCase().includes(term),
        )
      : orders;
  }, [orders, q]);
  const paging = useAdminPage(filtered, q);
  const rows = compact ? filtered.slice(0, 8) : paging.slice;

  if (orders.length === 0) {
    return (
      <AdminPanel fill>
        <AdminEmpty>No orders yet.</AdminEmpty>
      </AdminPanel>
    );
  }

  return (
    <AdminPanel fill={!compact}>
      {compact ? null : (
        <AdminCardToolbar>
          <AdminSearch value={q} onChange={setQ} label="Search orders" />
        </AdminCardToolbar>
      )}
      {filtered.length === 0 ? (
        <AdminEmpty>No orders match that search.</AdminEmpty>
      ) : (
        <AdminTable>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead className="hidden sm:table-cell">Customer</TableHead>
              <TableHead className="text-center">Lines</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead>Status</TableHead>
              {compact ? null : <TableHead className="text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                compact={Boolean(compact)}
                imageSrc={orderThumb(order, productById)}
              />
            ))}
          </TableBody>
        </AdminTable>
      )}
      {compact || filtered.length === 0 ? null : (
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

function orderThumb(
  order: AdminOrder,
  productById: Map<string, { image_url: string | null; category_slug: string | null }>,
) {
  const first = order.order_items[0];
  const productId = first?.product_id;
  if (!productId) return productImage("");
  const product = productById.get(productId);
  return product?.image_url?.trim() || productImage(product?.category_slug ?? "");
}

function OrderRow({
  order,
  compact = false,
  imageSrc,
}: {
  order: AdminOrder;
  compact?: boolean;
  imageSrc: string;
}) {
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
      <TableCell>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#f4f6fb]">
            <img src={imageSrc} alt="" className="h-full w-full object-cover" />
          </span>
          <AdminIdentity hint={order.order_items[0]?.product_name}>
            {order.reference}
          </AdminIdentity>
        </div>
      </TableCell>
      <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
        {new Date(order.created_at).toLocaleString("en-GB")}
      </TableCell>
      <TableCell className="hidden sm:table-cell">{order.shipping_name ?? "—"}</TableCell>
      <TableCell className="text-center tabular-nums">{order.order_items.length}</TableCell>
      <TableCell className="text-center tabular-nums">{formatGHS(Number(order.total))}</TableCell>
      <TableCell>
        {terminal || compact ? (
          <StatusBadge tone={orderStatusTone(order.status)}>{order.status}</StatusBadge>
        ) : (
          <Select
            value={order.status}
            onValueChange={(value) => void saveStatus(value as (typeof ORDER_STATUSES)[number])}
            disabled={busy || nextStatuses.length === 0}
          >
            <SelectTrigger className="h-9 min-h-9 w-40 rounded-full text-xs" aria-label={`Status for ${order.reference}`}>
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
        <TableCell className="text-center">
          {cancellable ? (
            <Button type="button" variant="ghost" size="sm" className="h-9 rounded-full" disabled={busy} onClick={() => void cancel()}>
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
