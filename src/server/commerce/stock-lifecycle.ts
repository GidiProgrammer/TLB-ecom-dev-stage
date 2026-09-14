import type { OrderStatus } from "../../lib/commerce-status.ts";
import { isOrderCancellable } from "../../lib/commerce-status.ts";

type Movement = {
  productId: string;
  changeQty: number;
  reason: "sale" | "return" | "restock";
  referenceId: string | null;
  note: string | null;
  createdBy: string | null;
};

type Order = {
  id: string;
  status: OrderStatus;
  items: { productId: string; quantity: number }[];
  cancelMail: number;
};

export class StockLifecycleStore {
  products = new Map<string, { stock: number }>();
  orders = new Map<string, Order>();
  movements: Movement[] = [];
  roles = new Map<string, "admin" | "staff" | "customer">();
  private locks = new Set<string>();

  seedProduct(id: string, stock: number) {
    this.products.set(id, { stock });
  }

  seedOrder(order: Order) {
    this.orders.set(order.id, { ...order, items: order.items.map((i) => ({ ...i })), cancelMail: 0 });
  }

  private withOrderLock<T>(orderId: string, fn: () => T): T {
    if (this.locks.has(orderId)) throw new Error("lock busy");
    this.locks.add(orderId);
    try {
      return fn();
    } finally {
      this.locks.delete(orderId);
    }
  }

  cancel(orderId: string): { ok: true; replayed: boolean; status: OrderStatus } | { ok: false; error: string } {
    try {
      return this.withOrderLock(orderId, () => {
        const order = this.orders.get(orderId);
        if (!order) return { ok: false, error: "Order not found" };
        if (order.status === "cancelled") return { ok: true, replayed: true, status: "cancelled" };
        if (!isOrderCancellable(order.status)) return { ok: false, error: "Order cannot be cancelled" };

        const returnKey = new Set(
          this.movements
            .filter((m) => m.reason === "return" && m.referenceId === orderId)
            .map((m) => m.productId),
        );

        for (const item of order.items) {
          if (returnKey.has(item.productId)) return { ok: false, error: "duplicate return" };
          const product = this.products.get(item.productId);
          if (!product) return { ok: false, error: "Product not found" };
          product.stock += item.quantity;
          this.movements.push({
            productId: item.productId,
            changeQty: item.quantity,
            reason: "return",
            referenceId: orderId,
            note: "order_cancel",
            createdBy: null,
          });
          returnKey.add(item.productId);
        }
        order.status = "cancelled";
        order.cancelMail += 1;
        return { ok: true, replayed: false, status: "cancelled" };
      });
    } catch {
      return { ok: false, error: "lock busy" };
    }
  }

  restock(
    userId: string,
    productId: string,
    qty: number,
    note: string,
  ): { ok: true; stock: number } | { ok: false; error: string } {
    const role = this.roles.get(userId);
    if (role !== "admin" && role !== "staff") return { ok: false, error: "Unauthorized" };
    if (!Number.isInteger(qty) || qty <= 0) return { ok: false, error: "Invalid quantity" };
    if (!note.trim()) return { ok: false, error: "Restock note is required" };
    const product = this.products.get(productId);
    if (!product) return { ok: false, error: "Product not found" };
    product.stock += qty;
    this.movements.push({
      productId,
      changeQty: qty,
      reason: "restock",
      referenceId: null,
      note: note.trim(),
      createdBy: userId,
    });
    return { ok: true, stock: product.stock };
  }
}
