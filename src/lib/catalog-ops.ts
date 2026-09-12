import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadStaffAccess } from "@/lib/staff";

const PRODUCT_COLUMNS =
  "id, slug, sku, name, description, category_id, unit_label, price, institutional_price, low_stock_threshold, image_url, is_active, deleted_at, deleted_reason, stock_quantity" as const;

const CATEGORY_COLUMNS = "id, name, slug, description" as const;

export type AdminCatalogProduct = {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  description: string | null;
  category_id: string | null;
  unit_label: string | null;
  price: number;
  institutional_price: number | null;
  low_stock_threshold: number;
  image_url: string | null;
  is_active: boolean;
  deleted_at: string | null;
  deleted_reason: string | null;
  stock_quantity: number;
  category_name: string | null;
  category_slug: string | null;
};

export type AdminCatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

function money(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative number`);
  const cents = Math.round(value * 100);
  if (cents > 9_999_999_999) throw new Error(`${label} is too large`);
  return cents / 100;
}

export function normalizeSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug || slug.length > 80) throw new Error("Enter a slug using letters, numbers, and hyphens.");
  return slug;
}

function emptyToNull(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

const productInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  slug: z.string().min(1).max(80),
  sku: z.string().max(40).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  unit_label: z.string().max(80).optional().nullable(),
  price: z.number(),
  institutional_price: z.number().optional().nullable(),
  low_stock_threshold: z.number().int().min(0).max(1_000_000),
  image_url: z.string().max(2048).optional().nullable(),
  is_active: z.boolean(),
});

const categoryInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  slug: z.string().min(1).max(80),
  description: z.string().max(1000).optional().nullable(),
});

const softDeleteSchema = z.object({
  productId: z.string().uuid(),
  reason: z.string().trim().min(3).max(240),
});

const restoreSchema = z.object({
  productId: z.string().uuid(),
});

function parseImageUrl(value: string | null | undefined) {
  const url = emptyToNull(value ?? null);
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Image URL must be a valid HTTPS address.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Image URL must use HTTPS.");
  }
  return url;
}

export const listAdminProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await loadStaffAccess(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products")
      .select(`${PRODUCT_COLUMNS}, categories(name, slug)`)
      .order("name", { ascending: true });
    if (error) {
      console.error("[listAdminProducts]", error.message);
      throw new Error("Could not load catalogue");
    }
    return (data ?? []).map((row) => {
      const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
      return {
        id: row.id,
        slug: row.slug,
        sku: row.sku,
        name: row.name,
        description: row.description,
        category_id: row.category_id,
        unit_label: row.unit_label,
        price: Number(row.price),
        institutional_price: row.institutional_price == null ? null : Number(row.institutional_price),
        low_stock_threshold: Number(row.low_stock_threshold ?? 5),
        image_url: row.image_url,
        is_active: row.is_active,
        deleted_at: row.deleted_at,
        deleted_reason: row.deleted_reason,
        stock_quantity: Number(row.stock_quantity ?? 0),
        category_name: category?.name ?? null,
        category_slug: category?.slug ?? null,
      } satisfies AdminCatalogProduct;
    });
  });

export const listAdminCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await loadStaffAccess(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("categories").select(CATEGORY_COLUMNS).order("name");
    if (error) {
      console.error("[listAdminCategories]", error.message);
      throw new Error("Could not load categories");
    }
    return (data ?? []) as AdminCatalogCategory[];
  });

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => productInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await loadStaffAccess(context.userId);
    const slug = normalizeSlug(data.slug);
    const sku = emptyToNull(data.sku);
    const description = emptyToNull(data.description);
    const unit_label = emptyToNull(data.unit_label);
    const image_url = parseImageUrl(data.image_url);
    const price = money(data.price, "Price");
    const institutional_price =
      data.institutional_price == null ? null : money(data.institutional_price, "Institutional price");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.category_id) {
      const { data: category, error: categoryError } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("id", data.category_id)
        .maybeSingle();
      if (categoryError || !category) throw new Error("Choose a valid category.");
    }

    const fields = {
      name: data.name.trim(),
      slug,
      sku,
      description,
      category_id: data.category_id ?? null,
      unit_label,
      price,
      institutional_price,
      low_stock_threshold: data.low_stock_threshold,
      image_url,
      is_active: data.is_active,
    };

    if (data.id) {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("products")
        .select("id, deleted_at")
        .eq("id", data.id)
        .maybeSingle();
      if (existingError || !existing) throw new Error("Product not found");
      if (existing.deleted_at) throw new Error("Restore this product before editing it.");

      const { data: row, error } = await supabaseAdmin
        .from("products")
        .update(fields)
        .eq("id", data.id)
        .select("id, slug, name")
        .maybeSingle();
      if (error) {
        console.error("[upsertProduct]", error.message);
        if (error.message.includes("duplicate") || error.code === "23505") {
          throw new Error("That slug or SKU is already in use.");
        }
        throw new Error("Could not save product");
      }
      if (!row) throw new Error("Could not save product");
      return { id: row.id, slug: row.slug, name: row.name };
    }

    const { data: row, error } = await supabaseAdmin
      .from("products")
      .insert({
        id: crypto.randomUUID(),
        ...fields,
      })
      .select("id, slug, name")
      .maybeSingle();
    if (error) {
      console.error("[upsertProduct]", error.message);
      if (error.message.includes("duplicate") || error.code === "23505") {
        throw new Error("That slug or SKU is already in use.");
      }
      throw new Error("Could not create product");
    }
    if (!row) throw new Error("Could not create product");
    return { id: row.id, slug: row.slug, name: row.name };
  });

export const softDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => softDeleteSchema.parse(data))
  .handler(async ({ data, context }) => {
    await loadStaffAccess(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("products")
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: context.userId,
        deleted_reason: data.reason,
      })
      .eq("id", data.productId)
      .select("id, slug, name")
      .maybeSingle();
    if (error) {
      console.error("[softDeleteProduct]", error.message);
      throw new Error("Could not remove product from the catalogue");
    }
    if (!row) throw new Error("Product not found");
    return { id: row.id, slug: row.slug, name: row.name };
  });

export const restoreProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => restoreSchema.parse(data))
  .handler(async ({ data, context }) => {
    const access = await loadStaffAccess(context.userId);
    if (!access.isAdmin) throw new Error("Unauthorized");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("products")
      .update({
        is_active: true,
        deleted_at: null,
        deleted_by: null,
        deleted_reason: null,
      })
      .eq("id", data.productId)
      .select("id, slug, name")
      .maybeSingle();
    if (error) {
      console.error("[restoreProduct]", error.message);
      throw new Error("Could not restore product");
    }
    if (!row) throw new Error("Product not found");
    return { id: row.id, slug: row.slug, name: row.name };
  });

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => categoryInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await loadStaffAccess(context.userId);
    const slug = normalizeSlug(data.slug);
    const description = emptyToNull(data.description);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fields = { name: data.name.trim(), slug, description };

    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("categories")
        .update(fields)
        .eq("id", data.id)
        .select(CATEGORY_COLUMNS)
        .maybeSingle();
      if (error) {
        console.error("[upsertCategory]", error.message);
        if (error.message.includes("duplicate") || error.code === "23505") {
          throw new Error("That category slug is already in use.");
        }
        throw new Error("Could not save category");
      }
      if (!row) throw new Error("Category not found");
      return row;
    }

    const { data: row, error } = await supabaseAdmin
      .from("categories")
      .insert(fields)
      .select(CATEGORY_COLUMNS)
      .maybeSingle();
    if (error) {
      console.error("[upsertCategory]", error.message);
      if (error.message.includes("duplicate") || error.code === "23505") {
        throw new Error("That category slug is already in use.");
      }
      throw new Error("Could not create category");
    }
    if (!row) throw new Error("Could not create category");
    return row;
  });
