import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { productImage } from "@/lib/catalog-utils";

export type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  description: string;
  image: string;
  subcategories: { name: string; note: string }[];
};

export type CatalogProduct = {
  id: string;
  productId: string;
  categoryId: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  unit: string;
  brand: string;
  stock: "in-stock" | "low-stock" | "backorder";
  stock_quantity: number;
  low_stock_threshold: number;
  bestSeller?: boolean;
  description: string;
  specs: { label: string; value: string }[];
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  blurb?: string | null;
  description?: string | null;
  subcategories?: { name: string; note: string }[] | null;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  price: number | string;
  unit_label?: string | null;
  stock_quantity?: number | null;
  low_stock_threshold?: number | null;
  brand?: string | null;
  subcategory?: string | null;
  specs?: { label: string; value: string }[] | null;
  category_id: string;
  categories?: CategoryRow | CategoryRow[] | null;
};

type CatalogClient = {
  from: (relation: string) => {
    select: (columns: string) => CatalogQuery;
  };
};

type CatalogQuery = {
  select: (columns: string) => CatalogQuery;
  eq: (column: string, value: string) => CatalogQuery;
  neq: (column: string, value: string) => CatalogQuery;
  or: (filters: string) => CatalogQuery;
  order: (column: string, options?: { ascending?: boolean }) => CatalogQuery;
  limit: (count: number) => CatalogQuery;
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
  then: Promise<{ data: unknown[] | null; error: { message: string } | null }>["then"];
};

const fromTable = (table: "categories" | "products") =>
  (supabase as unknown as CatalogClient).from(table);

function asError(error: { message: string } | null): Error | null {
  return error ? new Error(error.message) : null;
}

function categoryFromJoin(row: ProductRow): CategoryRow | null {
  const cat = row.categories;
  if (!cat) return null;
  return Array.isArray(cat) ? (cat[0] ?? null) : cat;
}

function mapCategory(row: CategoryRow): CatalogCategory {
  const description = row.description ?? "";
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    blurb: row.blurb ?? description,
    description,
    image: productImage(row.slug),
    subcategories: row.subcategories ?? [],
  };
}

function mapStock(quantity: number, threshold: number): CatalogProduct["stock"] {
  if (quantity <= 0) return "backorder";
  if (quantity <= threshold) return "low-stock";
  return "in-stock";
}

function mapProduct(row: ProductRow): CatalogProduct {
  const category = categoryFromJoin(row);
  const quantity = Number(row.stock_quantity ?? 0);
  const threshold = Number(row.low_stock_threshold ?? 5);
  return {
    id: row.slug,
    productId: row.id,
    categoryId: row.category_id,
    name: row.name,
    category: category?.slug ?? "",
    subcategory: row.subcategory ?? "",
    price: Number(row.price),
    unit: row.unit_label ?? "",
    brand: row.brand ?? "",
    stock: mapStock(quantity, threshold),
    stock_quantity: quantity,
    low_stock_threshold: threshold,
    bestSeller: false,
    description: row.description ?? "",
    specs: row.specs ?? [],
  };
}

const PRODUCT_SELECT = "*, categories(*)";

function escapeIlike(value: string) {
  return value.replace(/[%_,]/g, " ").trim();
}

async function fetchCategories(): Promise<CatalogCategory[]> {
  const { data, error } = await fromTable("categories").select("*").order("name");
  const err = asError(error);
  if (err) throw err;
  return ((data ?? []) as unknown as CategoryRow[]).map(mapCategory);
}

export async function fetchProductBySlug(slug: string): Promise<CatalogProduct | null> {
  const { data, error } = await fromTable("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  const err = asError(error);
  if (err) throw err;
  return data ? mapProduct(data as unknown as ProductRow) : null;
}

async function fetchProducts(opts: {
  search?: string | undefined;
  categorySlug?: string | undefined;
  sort?: string | undefined;
}): Promise<CatalogProduct[]> {
  const useInnerJoin = Boolean(opts.categorySlug && opts.categorySlug !== "all");
  let query = fromTable("products").select(
    useInnerJoin ? "*, categories!inner(*)" : PRODUCT_SELECT,
  );

  if (useInnerJoin) {
    query = query.eq("categories.slug", opts.categorySlug!);
  }

  const q = escapeIlike(opts.search ?? "");
  if (q) {
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }

  if (opts.sort === "price-asc") query = query.order("price", { ascending: true });
  else if (opts.sort === "price-desc") query = query.order("price", { ascending: false });
  else if (opts.sort === "name") query = query.order("name", { ascending: true });
  else query = query.order("name", { ascending: true });

  const { data, error } = await query;
  const err = asError(error);
  if (err) throw err;
  return ((data ?? []) as unknown as ProductRow[]).map(mapProduct);
}

async function fetchBestSellers(limit: number): Promise<CatalogProduct[]> {
  // TODO: add a featured/best_seller boolean column later
  const { data, error } = await fromTable("products")
    .select(PRODUCT_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  const err = asError(error);
  if (err) throw err;
  return ((data ?? []) as unknown as ProductRow[]).map(mapProduct);
}

async function fetchRelatedProducts(
  categoryId: string,
  excludeProductId: string,
  limit: number,
): Promise<CatalogProduct[]> {
  const { data, error } = await fromTable("products")
    .select(PRODUCT_SELECT)
    .eq("category_id", categoryId)
    .neq("id", excludeProductId)
    .limit(limit);
  const err = asError(error);
  if (err) throw err;
  return ((data ?? []) as unknown as ProductRow[]).map(mapProduct);
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
