const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

export function stockStatus(quantity: number, lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD): StockStatus {
  if (quantity <= 0) return "out-of-stock";
  if (quantity <= lowStockThreshold) return "low-stock";
  return "in-stock";
}

export function stockLabel(quantity: number, lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD) {
  const status = stockStatus(quantity, lowStockThreshold);
  if (status === "out-of-stock") return "Out of stock";
  if (status === "low-stock") return "Low stock";
  return "In stock";
}

/** How many more units can be added without exceeding known live stock. */
export function remainingPurchasableQty(stockQuantity: number, qtyAlreadyInCart: number) {
  if (!Number.isFinite(stockQuantity) || stockQuantity <= 0) return 0;
  if (!Number.isFinite(qtyAlreadyInCart) || qtyAlreadyInCart < 0) {
    return Math.floor(stockQuantity);
  }
  return Math.max(0, Math.floor(stockQuantity) - Math.floor(qtyAlreadyInCart));
}

/** Why a customer cannot add more units. Distinct from missing/discontinued products. */
export function unavailableReason(
  stockQuantity: number,
  qtyAlreadyInCart: number,
): "out-of-stock" | "in-cart" | null {
  if (stockQuantity <= 0) return "out-of-stock";
  if (remainingPurchasableQty(stockQuantity, qtyAlreadyInCart) <= 0) return "in-cart";
  return null;
}

export function purchaseUnavailableLabel(reason: "out-of-stock" | "in-cart") {
  return reason === "in-cart" ? "All in cart" : "Out of stock";
}

export function purchaseUnavailableMessage(reason: "out-of-stock" | "in-cart") {
  return reason === "in-cart"
    ? "All available units are already in your cart."
    : "This product is out of stock.";
}
