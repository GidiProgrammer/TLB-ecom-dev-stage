import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { productImage } from "@/lib/catalog-utils";
import type { Tables } from "@/integrations/supabase/types";

export type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
};

export type CatalogProduct = {
  /** Catalogue URL and cart/quote list key (`products.slug`). */
  id: string;
  slug: string;
  /** Live `products.id` (text). Used for order/quote RPCs. */
  productId: string;
  name: string;
  description: string;
  categoryId: string | null;
  categorySlug: string;
  categoryName: string;
  price: number;
  unit: string;
  sku: string | null;
  image: string;
  stock_quantity: number;
  low_stock_threshold: number;
};

type CategoryRow = Tables<"categories">;
type ProductRow = Tables<"products">;
type ProductWithCategory = ProductRow & {
  categories: CategoryRow | CategoryRow[] | null;
};

function loadError(fallback: string, error: { message: string } | null): Error | null {
  return error ? new Error(fallback) : null;
}

function categoryFromJoin(row: ProductWithCategory): CategoryRow | null {
  const cat = row.categories;
  if (!cat) return null;
  return Array.isArray(cat) ? (cat[0] ?? null) : cat;
}

function mapCategory(row: CategoryRow): CatalogCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    image: productImage(row.slug),
  };
}

function mapProduct(row: ProductWithCategory): CatalogProduct {
  const category = categoryFromJoin(row);
  const categorySlug = category?.slug ?? "";
  return {
    id: row.slug,
    slug: row.slug,
    productId: row.id,
    name: row.name,
    description: row.description ?? "",
    categoryId: row.category_id,
    categorySlug,
    categoryName: category?.name ?? "",
    price: Number(row.price),
    unit: row.unit_label ?? "",
    sku: row.sku,
    image: row.image_url || productImage(categorySlug),
    stock_quantity: Number(row.stock_quantity ?? 0),
    low_stock_threshold: Number(row.low_stock_threshold ?? 5),
  };
}

const PRODUCT_SELECT = "*, categories(*)" as const;

function escapeIlike(value: string) {
  return value.replace(/[%_,]/g, " ").trim();
}

async function fetchCategories(): Promise<CatalogCategory[]> {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  const err = loadError("Could not load categories", error);
  if (err) throw err;
  return (data ?? []).map(mapCategory);
}

export async function fetchProductBySlug(slug: string): Promise<CatalogProduct | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .is("deleted_at", null)
    .eq("slug", slug)
    .maybeSingle();
  const err = loadError("Could not load product", error);
  if (err) throw err;
  return data ? mapProduct(data) : null;
}

async function fetchProducts(opts: {
  search?: string | undefined;
  categorySlug?: string | undefined;
  sort?: string | undefined;
}): Promise<CatalogProduct[]> {
  const useInnerJoin = Boolean(opts.categorySlug && opts.categorySlug !== "all");
  let query = supabase
    .from("products")
    .select(useInnerJoin ? "*, categories!inner(*)" : PRODUCT_SELECT)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (useInnerJoin) {
    query = query.eq("categories.slug", opts.categorySlug!);
  }

  const q = escapeIlike(opts.search ?? "");
  if (q) {
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }

  if (opts.sort === "price-asc") query = query.order("price", { ascending: true });
  else if (opts.sort === "price-desc") query = query.order("price", { ascending: false });
  else query = query.order("name", { ascending: true });

  const { data, error } = await query;
  const err = loadError("Could not load products", error);
  if (err) throw err;
  return (data ?? []).map(mapProduct);
}

async function fetchBestSellers(limit: number): Promise<CatalogProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  const err = loadError("Could not load products", error);
  if (err) throw err;
  return (data ?? []).map(mapProduct);
}

async function fetchRelatedProducts(
  categoryId: string,
  excludeProductId: string,
  limit: number,
): Promise<CatalogProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .is("deleted_at", null)
    .eq("category_id", categoryId)
    .neq("id", excludeProductId)
    .limit(limit);
  const err = loadError("Could not load products", error);
  if (err) throw err;
  return (data ?? []).map(mapProduct);
}

export function useCategories() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
  return { data, isLoading, error };
}

export function useProducts(opts: {
  search?: string | undefined;
  categorySlug?: string | undefined;
  sort?: string | undefined;
} = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["products", opts],
    queryFn: () => fetchProducts(opts),
  });
  return { data, isLoading, error };
}

export function useProduct(slug: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug),
    enabled: Boolean(slug),
  });
  return { data, isLoading, error };
}

export function useBestSellers(limit = 8) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["best-sellers", limit],
    queryFn: () => fetchBestSellers(limit),
  });
  return { data, isLoading, error };
}

export function useRelatedProducts(categoryId: string, excludeProductId: string, limit = 4) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["related-products", categoryId, excludeProductId, limit],
    queryFn: () => fetchRelatedProducts(categoryId, excludeProductId, limit),
    enabled: Boolean(categoryId) && Boolean(excludeProductId),
  });
  return { data, isLoading, error };
}
