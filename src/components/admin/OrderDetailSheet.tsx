import { formatGHS } from "@/lib/catalog-utils";
import {
  allowedOrderTransitions,
  isOrderCancellable,
  isTerminalOrderStatus,
  type OrderStatus,
} from "@/lib/commerce-status";
import { orderDetailModel } from "@/lib/admin-detail";
import type { AdminOrder } from "@/lib/queries/admin";
import { DetailFacts, DetailSection, StaffDetailSheet } from "@/components/admin/StaffDetailSheet";
import { StatusBadge, orderStatusTone } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Constants } from "@/integrations/supabase/types";

const ORDER_STATUSES = Constants.public.Enums.order_status;

export function formatStaffTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function OrderStatusControl({
  reference,
  status,
  busy,
  onStatus,
  className,
  ariaLabel,
}: {
  reference: string;
  status: OrderStatus;
  busy: boolean;
  onStatus: (status: OrderStatus) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const nextStatuses = allowedOrderTransitions(status);
  if (isTerminalOrderStatus(status)) {
    return <StatusBadge tone={orderStatusTone(status)}>{status}</StatusBadge>;
  }
  return (
    <Select
      value={status}
      onValueChange={(value) => onStatus(value as OrderStatus)}
      disabled={busy || nextStatuses.length === 0}
    >
      <SelectTrigger
        className={className ?? "h-11 min-h-11 w-full rounded-[8px] text-xs sm:w-44"}
        aria-label={ariaLabel ?? `Order status for ${reference}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={status} className="capitalize">
          {status.replaceAll("_", " ")}
        </SelectItem>
        {nextStatuses.map((next) => (
          <SelectItem key={next} value={next} className="capitalize">
            {next.replaceAll("_", " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function OrderDetailSheet({
  order,
  busy,
  onOpenChange,
  onStatus,
  onCancel,
}: {
  order: AdminOrder | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onStatus: (status: (typeof ORDER_STATUSES)[number]) => void;
  onCancel: () => void;
}) {
  const model = order ? orderDetailModel(order) : null;
  const cancellable = order ? isOrderCancellable(order.status) : false;

  return (
    <StaffDetailSheet
      open={order != null}
      onOpenChange={onOpenChange}
      eyebrow="Order"
      title={model?.reference ?? "Order"}
      description={
        model
          ? `Created ${formatStaffTimestamp(model.createdAt)}. Last updated ${formatStaffTimestamp(model.updatedAt)}.`
          : "Order details"
      }
      meta={model ? <StatusBadge tone={orderStatusTone(model.status)}>{model.status}</StatusBadge> : null}
      footer={
        model && order ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <OrderStatusControl
              reference={model.reference}
              status={order.status}
              busy={busy}
              onStatus={onStatus}
            />
            {cancellable ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 min-h-11 rounded-[8px]"
                disabled={busy}
                onClick={onCancel}
              >
                Cancel order
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {model ? (
        <>
          <DetailSection title="Customer">
            <DetailFacts rows={model.customer} empty="No contact details were stored with this order." />
          </DetailSection>
          <DetailSection title="Delivery">
            <DetailFacts rows={model.delivery} empty="No delivery details were stored with this order." />
          </DetailSection>
          <DetailSection title="Items">
            {model.items.length === 0 ? (
              <p className="text-sm text-[#55515f]">No products were stored on this order.</p>
            ) : (
              <ul className="divide-y divide-[#e4e1ea] border-y border-[#e4e1ea]">
                {model.items.map((item) => (
                  <li key={item.id} className="py-3">
                    <p className="text-sm font-semibold break-words text-[#18161d]">{item.productName}</p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                      <div>
                        <dt className="text-xs text-[#55515f]">Quantity</dt>
                        <dd className="mt-0.5 text-sm font-medium tabular-nums">{item.quantity}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-[#55515f]">Unit price</dt>
                        <dd className="mt-0.5 text-sm font-medium tabular-nums">{formatGHS(item.unitPrice)}</dd>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <dt className="text-xs text-[#55515f]">Line total</dt>
                        <dd className="mt-0.5 text-sm font-medium tabular-nums">{formatGHS(item.lineTotal)}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>
          <DetailSection title="Summary">
            <dl className="space-y-2 border-y border-[#e4e1ea] py-3">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-[#55515f]">Subtotal</dt>
                <dd className="text-sm font-medium tabular-nums">{formatGHS(model.subtotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm font-semibold text-[#18161d]">Total</dt>
                <dd className="text-base font-semibold text-[#523784] tabular-nums">{formatGHS(model.total)}</dd>
              </div>
              {model.paymentReference ? (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-sm text-[#55515f]">Payment reference</dt>
                  <dd className="min-w-0 text-right text-sm break-words">{model.paymentReference}</dd>
                </div>
              ) : null}
            </dl>
          </DetailSection>
        </>
      ) : null}
    </StaffDetailSheet>
  );
}
