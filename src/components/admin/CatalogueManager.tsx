import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listAdminCategories,
  listAdminProducts,
  restoreProduct,
  softDeleteProduct,
  staffRestockProduct,
  upsertCategory,
  upsertProduct,
  type AdminCatalogCategory,
  type AdminCatalogProduct,
} from "@/lib/catalog-ops";
import { formatGHS } from "@/lib/catalog-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminEmpty, AdminPanel, AdminSearch } from "@/components/admin/AdminPageHeader";
import { StatusBadge, catalogStatusTone } from "@/components/admin/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function mutationMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function productStatus(product: AdminCatalogProduct) {
  if (product.deleted_at) return "Deleted";
  if (!product.is_active) return "Inactive";
  return "Active";
}

export function ProductCatalogue({ canRestore }: { canRestore: boolean }) {
  const queryClient = useQueryClient();
  const products = useQuery({ queryKey: ["admin-catalogue"], queryFn: () => listAdminProducts() });
  const categories = useQuery({ queryKey: ["admin-categories"], queryFn: () => listAdminCategories() });
  const [selectedId, setSelectedId] = useState<string>("new");
  const [q, setQ] = useState("");

  const selected = useMemo(
    () => (products.data ?? []).find((p) => p.id === selectedId) ?? null,
    [products.data, selectedId],
  );

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-catalogue"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
    ]);
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = products.data ?? [];
    if (!term) return list;
    return list.filter((p) =>
      [p.name, p.sku ?? "", p.slug, productStatus(p), p.category_name ?? ""].join(" ").toLowerCase().includes(term),
    );
  }, [products.data, q]);

  if (products.isLoading || categories.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading catalogue…</p>;
  }
  if (products.error || categories.error) {
    return <p className="text-sm text-muted-foreground">Could not load the catalogue. Please try again.</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPanel>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <AdminSearch value={q} onChange={setQ} label="Search products" />
          <Button type="button" variant="outline" size="sm" onClick={() => setSelectedId("new")}>
            New product
          </Button>
        </div>
        {(products.data ?? []).length === 0 ? (
          <AdminEmpty>No products in the catalogue.</AdminEmpty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">SKU</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => (
                <TableRow key={product.id} data-state={selectedId === product.id ? "selected" : undefined}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{product.sku ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{product.category_name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatGHS(Number(product.price))}</TableCell>
                  <TableCell className="text-right tabular-nums">{product.stock_quantity}</TableCell>
                  <TableCell>
                    <StatusBadge tone={catalogStatusTone(productStatus(product))}>
                      {productStatus(product)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedId(product.id)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminPanel>
      <ProductEditor
        products={products.data ?? []}
        categories={categories.data ?? []}
        selectedId={selectedId}
        selected={selected}
        onSelect={setSelectedId}
        canRestore={canRestore}
        onSaved={refresh}
      />
    </div>
  );
}

export function CategoryCatalogue() {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ["admin-categories"], queryFn: () => listAdminCategories() });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("new");
  const [q, setQ] = useState("");

  const selectedCategory = useMemo(
    () => (categories.data ?? []).find((c) => c.id === selectedCategoryId) ?? null,
    [categories.data, selectedCategoryId],
  );

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = categories.data ?? [];
    if (!term) return list;
    return list.filter((c) => [c.name, c.slug, c.description ?? ""].join(" ").toLowerCase().includes(term));
  }, [categories.data, q]);

  if (categories.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading catalogue…</p>;
  }
  if (categories.error) {
    return <p className="text-sm text-muted-foreground">Could not load the catalogue. Please try again.</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPanel>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <AdminSearch value={q} onChange={setQ} label="Search categories" />
          <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCategoryId("new")}>
            New category
          </Button>
        </div>
        {(categories.data ?? []).length === 0 ? (
          <AdminEmpty>No categories yet.</AdminEmpty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.slug}</TableCell>
                  <TableCell className="hidden max-w-sm truncate md:table-cell">
                    {category.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCategoryId(category.id)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminPanel>
      <CategoryEditor
        categories={categories.data ?? []}
        selectedId={selectedCategoryId}
        selected={selectedCategory}
        onSelect={setSelectedCategoryId}
        onSaved={refresh}
      />
    </div>
  );
}

export function CatalogueManager({ canRestore }: { canRestore: boolean }) {
  return (
    <div className="space-y-8">
      <ProductCatalogue canRestore={canRestore} />
      <CategoryCatalogue />
    </div>
  );
}

function ProductEditor({
  products,
  categories,
  selectedId,
  selected,
  onSelect,
  canRestore,
  onSaved,
}: {
  products: AdminCatalogProduct[];
  categories: AdminCatalogCategory[];
  selectedId: string;
  selected: AdminCatalogProduct | null;
  onSelect: (id: string) => void;
  canRestore: boolean;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [restockQty, setRestockQty] = useState("1");
  const [restockNote, setRestockNote] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    sku: "",
    description: "",
    category_id: "",
    unit_label: "",
    price: "0",
    institutional_price: "",
    low_stock_threshold: "5",
    image_url: "",
    is_active: true,
  });

  useEffect(() => {
    if (!selected) {
      setForm({
        name: "",
        slug: "",
        sku: "",
        description: "",
        category_id: "",
        unit_label: "",
        price: "0",
        institutional_price: "",
        low_stock_threshold: "5",
        image_url: "",
        is_active: true,
      });
    setReason("");
    setRestockQty("1");
    setRestockNote("");
    return;
  }
  setForm({
      name: selected.name,
      slug: selected.slug,
      sku: selected.sku ?? "",
      description: selected.description ?? "",
      category_id: selected.category_id ?? "",
      unit_label: selected.unit_label ?? "",
      price: String(selected.price),
      institutional_price: selected.institutional_price == null ? "" : String(selected.institutional_price),
      low_stock_threshold: String(selected.low_stock_threshold),
      image_url: selected.image_url ?? "",
      is_active: selected.is_active,
    });
    setReason("");
    setRestockQty("1");
    setRestockNote("");
  }, [selected]);

  const save = async () => {
    const price = Number(form.price);
    const threshold = Number(form.low_stock_threshold);
    const institutional = form.institutional_price.trim() === "" ? null : Number(form.institutional_price);
    setBusy(true);
    try {
      const saved = await upsertProduct({
        data: {
          id: selected?.id,
          name: form.name,
          slug: form.slug,
          sku: form.sku,
          description: form.description,
          category_id: form.category_id || null,
          unit_label: form.unit_label,
          price,
          institutional_price: institutional,
          low_stock_threshold: threshold,
          image_url: form.image_url,
          is_active: form.is_active,
        },
      });
      toast.success(`Saved ${saved.name}`);
      await onSaved();
      onSelect(saved.id);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not save product"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await softDeleteProduct({ data: { productId: selected.id, reason } });
      toast.success(`${selected.name} removed from the shop`);
      await onSaved();
    } catch (error) {
      toast.error(mutationMessage(error, "Could not remove product"));
    } finally {
      setBusy(false);
    }
  };

  const restock = async () => {
    if (!selected) return;
    const quantity = Number(restockQty);
    setBusy(true);
    try {
      const result = await staffRestockProduct({
        data: { productId: selected.id, quantity, note: restockNote },
      });
      toast.success(`Stock is now ${result.stockQuantity}`);
      setRestockNote("");
      await onSaved();
    } catch (error) {
      toast.error(mutationMessage(error, "Could not restock product"));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await restoreProduct({ data: { productId: selected.id } });
      toast.success(`${selected.name} restored`);
      await onSaved();
    } catch (error) {
      toast.error(mutationMessage(error, "Could not restore product"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminPanel className="p-5">
      <h2 className="text-base font-semibold">{selected ? "Edit product" : "New product"}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Includes inactive and removed products. Stock quantity is shown for reference and cannot be changed here.
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <select className="sr-only" aria-label="Select product" value={selectedId} onChange={(e) => onSelect(e.target.value)}>
          <option value="new">New product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({productStatus(product)})
            </option>
          ))}
        </select>
        {selected ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <StatusBadge tone={catalogStatusTone(productStatus(selected))}>{productStatus(selected)}</StatusBadge>
            <span className="text-muted-foreground">
              Stock on hand: {selected.stock_quantity} (not editable here)
            </span>
            {selected.deleted_reason ? (
              <span className="text-muted-foreground">Removed: {selected.deleted_reason}</span>
            ) : null}
          </div>
        ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="p-name" label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
            <Field id="p-slug" label="Slug" value={form.slug} onChange={(v) => setForm((f) => ({ ...f, slug: v }))} required />
            <Field id="p-sku" label="SKU" value={form.sku} onChange={(v) => setForm((f) => ({ ...f, sku: v }))} />
            <label className="block text-sm">
              <span className="text-xs font-medium">Category</span>
              <select
                id="p-category"
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <Field id="p-unit" label="Unit label" value={form.unit_label} onChange={(v) => setForm((f) => ({ ...f, unit_label: v }))} />
            <Field id="p-price" label="Price (GHS)" value={form.price} onChange={(v) => setForm((f) => ({ ...f, price: v }))} />
            <Field
              id="p-inst-price"
              label="Institutional price (optional)"
              value={form.institutional_price}
              onChange={(v) => setForm((f) => ({ ...f, institutional_price: v }))}
            />
            <Field
              id="p-low"
              label="Low stock threshold"
              value={form.low_stock_threshold}
              onChange={(v) => setForm((f) => ({ ...f, low_stock_threshold: v }))}
            />
            <div className="sm:col-span-2">
              <Field
                id="p-image"
                label="Image URL (HTTPS)"
                value={form.image_url}
                onChange={(v) => setForm((f) => ({ ...f, image_url: v }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                disabled={Boolean(selected?.deleted_at)}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Visible in the shop
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy || Boolean(selected?.deleted_at)}>
            {busy ? "Saving…" : selected ? "Save product" : "Create product"}
          </Button>
          </div>
          {selected && !selected.deleted_at ? (
            <div className="rounded-md border border-border p-4">
              <p className="text-sm font-medium">Increase sellable stock</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This adds quantity on the shop. It is not warehouse receiving.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr_auto]">
                <div>
                  <Label htmlFor="p-restock-qty">Quantity</Label>
                  <Input
                    id="p-restock-qty"
                    type="number"
                    min={1}
                    step={1}
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="p-restock-note">Reason</Label>
                  <Input
                    id="p-restock-note"
                    value={restockNote}
                    onChange={(e) => setRestockNote(e.target.value)}
                    placeholder="e.g. supplier delivery"
                    className="mt-1.5"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || restockNote.trim().length < 3}
                    onClick={() => void restock()}
                  >
                    Add stock
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {selected && !selected.deleted_at ? (
            <div className="rounded-md border border-border p-4">
              <Label htmlFor="p-reason">Remove from shop (soft delete)</Label>
              <Input
                id="p-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason"
                className="mt-1.5"
              />
              <Button type="button" variant="outline" className="mt-3" disabled={busy || reason.trim().length < 3} onClick={() => void remove()}>
                Remove from catalogue
              </Button>
            </div>
          ) : null}
          {selected?.deleted_at && canRestore ? (
            <Button type="button" variant="outline" disabled={busy} onClick={() => void restore()}>
              Restore product
            </Button>
          ) : null}
        {selected?.deleted_at && !canRestore ? (
          <p className="text-xs text-muted-foreground">Only an admin can restore a removed product.</p>
        ) : null}
      </form>
    </AdminPanel>
  );
}

function CategoryEditor({
  categories,
  selectedId,
  selected,
  onSelect,
  onSaved,
}: {
  categories: AdminCatalogCategory[];
  selectedId: string;
  selected: AdminCatalogCategory | null;
  onSelect: (id: string) => void;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });

  useEffect(() => {
    if (!selected) {
      setForm({ name: "", slug: "", description: "" });
      return;
    }
    setForm({ name: selected.name, slug: selected.slug, description: selected.description ?? "" });
  }, [selected]);

  const save = async () => {
    setBusy(true);
    try {
      const saved = await upsertCategory({
        data: {
          id: selected?.id,
          name: form.name,
          slug: form.slug,
          description: form.description,
        },
      });
      toast.success(`Saved ${saved.name}`);
      await onSaved();
      onSelect(saved.id);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not save category"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminPanel className="p-5">
      <h2 className="text-base font-semibold">{selected ? "Edit category" : "New category"}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Create or rename categories. Products are not deleted when a category is edited.
      </p>
      <select className="sr-only" aria-label="Select category" value={selectedId} onChange={(e) => onSelect(e.target.value)}>
        <option value="new">New category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="c-name" label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
            <Field id="c-slug" label="Slug" value={form.slug} onChange={(v) => setForm((f) => ({ ...f, slug: v }))} required />
            <div className="sm:col-span-2">
              <Label htmlFor="c-desc">Description</Label>
              <Textarea
                id="c-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1.5"
              />
            </div>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : selected ? "Save category" : "Create category"}
          </Button>
        </form>
    </AdminPanel>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} required={required} onChange={(e) => onChange(e.target.value)} className="mt-1.5" />
    </div>
  );
}
