export function mapOrderError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("unauthorized")) return "Unauthorized: user does not match the signed-in account";
  if (lower.includes("no items")) return "Your cart is empty";
  if (lower.includes("not found") || lower.includes("not available")) return "A product in your cart is not available";
  if (lower.includes("insufficient stock")) return "Insufficient stock for one or more products";
  if (lower.includes("invalid quantity") || lower.includes("quantity")) return "Invalid quantity";
  return "We couldn't place your order right now. Please try again or contact TLB.";
}
