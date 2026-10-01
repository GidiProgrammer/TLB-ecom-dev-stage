import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatGHS, productImage } from "@/lib/catalog-utils";
import { listAdminProducts } from "@/lib/catalog-ops";
import { Constants } from "@/integrations/supabase/types";
import { isOrderCancellable, isTerminalOrderStatus } from "@/lib/commerce-status";
import { cancelOrder, updateOrderStatus } from "@/lib/admin-ops";
import type { AdminOrder } from "@/lib/queries/admin";
import { OrderDetailSheet, OrderStatusControl } from "@/components/admin/OrderDetailSheet";
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
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const catalogue = useQuery({ queryKey: ["admin-catalogue"], queryFn: () => listAdminProducts() });
  const productById = useMemo(
    () => new Map((catalogue.data ?? []).map((product) => [product.id, product])),
    [catalogue.data],
  );
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term
      ? orders.filter(
          (order) =>
            order.reference.toLowerCase().includes(term) ||
            (order.shipping_name ?? "").toLowerCase().includes(term) ||
            order.status.toLowerCase().includes(term),
        )
      : orders;
  }, [orders, q]);
  const paging = useAdminPage(filtered, q);
  const rows = compact ? filtered.slice(0, 8) : paging.slice;
  const openOrder = orders.find((order) => order.id === openId) ?? null;

  const saveStatus = async (order: AdminOrder, status: (typeof ORDER_STATUSES)[number]) => {
    if (status === order.status) return;
    setBusyId(order.id);
    try {
      await updateOrderStatus({ data: { orderId: order.id, status } });
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success(`Order ${order.reference} updated`);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not update order status"));
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (order: AdminOrder) => {
    setBusyId(order.id);
    try {
      await cancelOrder({ data: { orderId: order.id } });
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success(`Order ${order.reference} cancelled`);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not cancel order"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <OrderList
        orders={orders}
        compact={Boolean(compact)}
        q={q}
        setQ={setQ}
        filtered={filtered}
        rows={rows}
        paging={paging}
        openId={openId}
        busyId={busyId}
        productById={productById}
        onOpen={setOpenId}
        onStatus={(order, status) => void saveStatus(order, status)}
        onCancel={(order) => void cancel(order)}
      />
      <OrderDetailSheet
        order={openOrder}
        busy={openOrder != null && busyId === openOrder.id}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
        onStatus={(status) => {
          if (openOrder) void saveStatus(openOrder, status);
        }}
        onCancel={() => {
          if (openOrder) void cancel(openOrder);
        }}
      />
    </>
  );
}

function OrderList({
  orders,
  compact,
  q,
  setQ,
  filtered,
  rows,
  paging,
  openId,
  busyId,
  productById,
  onOpen,
  onStatus,
  onCancel,
}: {
  orders: AdminOrder[];
  compact?: boolean;
  q: string;
  setQ: (value: string) => void;
  filtered: AdminOrder[];
  rows: AdminOrder[];
  paging: ReturnType<typeof useAdminPage<AdminOrder>>;
  openId: string | null;
  busyId: string | null;
  productById: Map<string, { image_url: string | null; category_slug: string | null }>;
  onOpen: (id: string) => void;
  onStatus: (order: AdminOrder, status: (typeof ORDER_STATUSES)[number]) => void;
  onCancel: (order: AdminOrder) => void;
}) {
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
              <TableHead className="text-right">Lines</TableHead>
              <TableHead className="text-right">Total</TableHead>
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
                selected={openId === order.id}
                busy={busyId === order.id}
                imageSrc={orderThumb(order, productById)}
                onOpen={() => onOpen(order.id)}
                onStatus={(status) => onStatus(order, status)}
                onCancel={() => onCancel(order)}
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
  selected,
  busy,
  imageSrc,
  onOpen,
  onStatus,
  onCancel,
}: {
  order: AdminOrder;
  compact?: boolean;
  selected: boolean;
  busy: boolean;
  imageSrc: string;
  onOpen: () => void;
  onStatus: (status: (typeof ORDER_STATUSES)[number]) => void;
  onCancel: () => void;
}) {
  const terminal = isTerminalOrderStatus(order.status);
  const cancellable = isOrderCancellable(order.status);

  return (
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-admin-table">
            <img src={imageSrc} alt="" className="h-full w-full object-cover" />
          </span>
          <button
            type="button"
            className="min-w-0 rounded-[8px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#523784]"
            aria-haspopup="dialog"
            aria-expanded={selected}
            aria-label={`Open order ${order.reference}`}
            onClick={onOpen}
          >
            <AdminIdentity hint={order.order_items[0]?.product_name}>{order.reference}</AdminIdentity>
          </button>
        </div>
      </TableCell>
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
          <OrderStatusControl
            reference={order.reference}
            status={order.status}
            busy={busy}
            onStatus={onStatus}
            className="h-11 min-h-11 w-40 rounded-[8px] text-xs"
            ariaLabel={`Status for ${order.reference}`}
          />
        )}
      </TableCell>
      {compact ? null : (
        <TableCell className="text-center">
          {cancellable ? (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onCancel}>
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
