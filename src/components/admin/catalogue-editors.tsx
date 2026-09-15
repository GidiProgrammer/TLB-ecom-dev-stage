import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  restoreProduct,
  softDeleteProduct,
  staffRestockProduct,
  upsertCategory,
  upsertProduct,
  type AdminCatalogCategory,
  type AdminCatalogProduct,
} from "@/lib/catalog-ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, catalogStatusTone } from "@/components/admin/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function mutationMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

const PRODUCT_DRAFTS_KEY = "tlb-admin-product-drafts";
const CATEGORY_DRAFTS_KEY = "tlb-admin-category-drafts";

type ProductFormState = {
  name: string;
  slug: string;
  sku: string;
  description: string;
  category_id: string;
  unit_label: string;
  price: string;
  institutional_price: string;
  low_stock_threshold: string;
  image_url: string;
  is_active: boolean;
};

type ProductDraft = {
  form: ProductFormState;
  reason: string;
  restockQty: string;
  restockNote: string;
};

type CategoryFormState = { name: string; slug: string; description: string };

const emptyProductForm = (): ProductFormState => ({
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

function productStatus(product: AdminCatalogProduct) {
  if (product.deleted_at) return "Deleted";
  if (!product.is_active) return "Inactive";
  return "Active";
}

function formFromProduct(selected: AdminCatalogProduct | null): ProductFormState {
  if (!selected) return emptyProductForm();
  return {
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
  };
}

function readDrafts<T>(key: string): Record<string, T> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, T>;
  } catch {
    return {};
  }
}

function writeDraft<T>(key: string, id: string, value: T) {
  if (typeof window === "undefined") return;
  const all = readDrafts<T>(key);
  all[id] = value;
  window.localStorage.setItem(key, JSON.stringify(all));
}

function clearDraft(key: string, id: string) {
  if (typeof window === "undefined") return;
  const all = readDrafts<unknown>(key);
  delete all[id];
  window.localStorage.setItem(key, JSON.stringify(all));
}

export function ProductEditor({
  open,
  onOpenChange,
  categories,
  selectedId,
  selected,
  canRestore,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: AdminCatalogCategory[];
  selectedId: string;
  selected: AdminCatalogProduct | null;
  canRestore: boolean;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [restockQty, setRestockQty] = useState("1");
  const [restockNote, setRestockNote] = useState("");
  const [form, setForm] = useState<ProductFormState>(emptyProductForm);
  const skipPersist = useRef(false);
  const snapshot = useRef({ selectedId, form, reason, restockQty, restockNote });
  snapshot.current = { selectedId, form, reason, restockQty, restockNote };

  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    if (!open) return;
    const current = selectedRef.current;
    const draft = readDrafts<ProductDraft>(PRODUCT_DRAFTS_KEY)[selectedId];
    if (draft?.form) {
      setForm(draft.form);
      setReason(draft.reason);
      setRestockQty(draft.restockQty);
      setRestockNote(draft.restockNote);
      return;
    }
    setForm(formFromProduct(current));
    setReason("");
    setRestockQty("1");
    setRestockNote("");
  }, [open, selectedId]);

  const persist = () => {
    const snap = snapshot.current;
    writeDraft<ProductDraft>(PRODUCT_DRAFTS_KEY, snap.selectedId, {
      form: snap.form,
      reason: snap.reason,
      restockQty: snap.restockQty,
      restockNote: snap.restockNote,
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !skipPersist.current) persist();
    skipPersist.current = false;
    onOpenChange(next);
  };

  const save = async () => {
    const price = Number(form.price);
    const threshold = Number(form.low_stock_threshold);
    const institutional = form.institutional_price.trim() === "" ? null : Number(form.institutional_price);
    setBusy(true);
    try {
      const saved = await upsertProduct({
        data: {
          ...(selected?.id ? { id: selected.id } : {}),
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
      clearDraft(PRODUCT_DRAFTS_KEY, selectedId);
      if (saved.id !== selectedId) clearDraft(PRODUCT_DRAFTS_KEY, saved.id);
      skipPersist.current = true;
      await onSaved();
      onOpenChange(false);
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
      clearDraft(PRODUCT_DRAFTS_KEY, selected.id);
      skipPersist.current = true;
      await onSaved();
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(90dvh,44rem)] max-w-2xl overflow-y-auto rounded-2xl [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center">
        <DialogHeader>
          <DialogTitle>{selected ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>
            Includes inactive and removed products. Stock on hand is shown for reference and cannot be changed here.
            Closing this dialog keeps a local draft until you save.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
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
                className="mt-1.5 h-11 min-h-11 w-full rounded-md border border-input bg-transparent px-2 text-sm"
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
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                disabled={Boolean(selected?.deleted_at)}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Visible in the shop
            </label>
          </div>
          <Button type="submit" disabled={busy || Boolean(selected?.deleted_at)}>
            {busy ? "Saving…" : selected ? "Save product" : "Create product"}
          </Button>
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
      </DialogContent>
    </Dialog>
  );
}

export function CategoryEditor({
  open,
  onOpenChange,
  selectedId,
  selected,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedId: string;
  selected: AdminCatalogCategory | null;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<CategoryFormState>({ name: "", slug: "", description: "" });
  const skipPersist = useRef(false);
  const snapshot = useRef({ selectedId, form });
  snapshot.current = { selectedId, form };

  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    if (!open) return;
    const current = selectedRef.current;
    const draft = readDrafts<CategoryFormState>(CATEGORY_DRAFTS_KEY)[selectedId];
    if (draft) {
      setForm(draft);
      return;
    }
    if (!current) {
      setForm({ name: "", slug: "", description: "" });
      return;
    }
    setForm({ name: current.name, slug: current.slug, description: current.description ?? "" });
  }, [open, selectedId]);

  const handleOpenChange = (next: boolean) => {
    if (!next && !skipPersist.current) {
      writeDraft(CATEGORY_DRAFTS_KEY, snapshot.current.selectedId, snapshot.current.form);
    }
    skipPersist.current = false;
    onOpenChange(next);
  };

  const save = async () => {
    setBusy(true);
    try {
      const saved = await upsertCategory({
        data: {
          ...(selected?.id ? { id: selected.id } : {}),
          name: form.name,
          slug: form.slug,
          description: form.description,
        },
      });
      toast.success(`Saved ${saved.name}`);
      clearDraft(CATEGORY_DRAFTS_KEY, selectedId);
      if (saved.id !== selectedId) clearDraft(CATEGORY_DRAFTS_KEY, saved.id);
      skipPersist.current = true;
      await onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(mutationMessage(error, "Could not save category"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(90dvh,36rem)] max-w-lg overflow-y-auto rounded-2xl [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center">
        <DialogHeader>
          <DialogTitle>{selected ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            Create or rename categories. Products are not deleted when a category is edited. Closing this dialog keeps
            a local draft until you save.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
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
      </DialogContent>
    </Dialog>
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
