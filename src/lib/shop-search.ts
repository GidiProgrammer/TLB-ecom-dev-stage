const SHOP_SORTS = ["price-asc", "price-desc"] as const;

export type ShopSort = (typeof SHOP_SORTS)[number];

/** Name order is the default and is stored as an absent sort param. */
export function normalizeShopSort(value: unknown): ShopSort | undefined {
  if (value === "price-asc" || value === "price-desc") return value;
  return undefined;
}
