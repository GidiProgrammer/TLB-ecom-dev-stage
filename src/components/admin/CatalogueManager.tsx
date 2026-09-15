import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAdminCategories,
  listAdminProducts,
  type AdminCatalogProduct,
} from "@/lib/catalog-ops";
import { formatGHS, productImage } from "@/lib/catalog-utils";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminCardToolbar,
  AdminEmpty,
  AdminIconButton,
  AdminIdentity,
  AdminLoading,
  AdminPageHeader,
  AdminPageStack,
  AdminPagination,
  AdminPanel,
  AdminSearch,
  AdminTable,
  useAdminPage,
} from "@/components/admin/AdminPageHeader";
import { CategoryEditor, ProductEditor } from "@/components/admin/catalogue-editors";
import { StatusBadge, catalogStatusTone } from "@/components/admin/StatusBadge";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [editorOpen, setEditorOpen] = useState(false);
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
  const paging = useAdminPage(filtered, q);

  if (products.isLoading || categories.isLoading) {
    return <AdminLoading label="Loading catalogue" />;
  }
  if (products.error || categories.error) {
    return <p className="text-sm text-muted-foreground">Could not load the catalogue. Please try again.</p>;
  }

  return (
    <AdminPageStack>
      <AdminPageHeader
        title="Products"
        description="Table-first catalogue editing. Stock on hand is shown for reference and is not edited as a raw field."
        action={
          <Button
            type="button"
            className="rounded-full"
            onClick={() => {
              setSelectedId("new");
              setEditorOpen(true);
            }}
          >
            New product
          </Button>
        }
      />
      <AdminPanel fill>
        <AdminCardToolbar>
          <AdminSearch value={q} onChange={setQ} label="Search products" />
        </AdminCardToolbar>
        {(products.data ?? []).length === 0 ? (
          <AdminEmpty>No products in the catalogue.</AdminEmpty>
        ) : (
          <AdminTable>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">SKU</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="text-center">Price</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paging.slice.map((product) => (
                <TableRow key={product.id} data-state={selectedId === product.id ? "selected" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#f4f6fb]">
                        <img
                          src={product.image_url?.trim() || productImage(product.category_slug ?? "")}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <AdminIdentity>{product.name}</AdminIdentity>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{product.sku ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{product.category_name ?? "—"}</TableCell>
                  <TableCell className="text-center tabular-nums">{formatGHS(Number(product.price))}</TableCell>
                  <TableCell className="text-center tabular-nums">{product.stock_quantity}</TableCell>
                  <TableCell>
                    <StatusBadge tone={catalogStatusTone(productStatus(product))}>
                      {productStatus(product)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-center">
                    <AdminIconButton
                      label={`Edit ${product.name}`}
                      onClick={() => {
                        setSelectedId(product.id);
                        setEditorOpen(true);
                      }}
                    >
                      <Pencil />
                    </AdminIconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AdminTable>
        )}
        {(products.data ?? []).length === 0 ? null : (
          <AdminPagination
            page={paging.page}
            pageCount={paging.pageCount}
            start={paging.start}
            end={paging.end}
            total={paging.total}
            onPage={paging.setPage}
          />
        )}
      </AdminPanel>
      <ProductEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        categories={categories.data ?? []}
        selectedId={selectedId}
        selected={selected}
        canRestore={canRestore}
        onSaved={refresh}
      />
    </AdminPageStack>
  );
}

export function CategoryCatalogue() {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ["admin-categories"], queryFn: () => listAdminCategories() });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("new");
  const [editorOpen, setEditorOpen] = useState(false);
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
  const paging = useAdminPage(filtered, q);

  if (categories.isLoading) {
    return <AdminLoading label="Loading categories" />;
  }
  if (categories.error) {
    return <p className="text-sm text-muted-foreground">Could not load the catalogue. Please try again.</p>;
  }

  return (
    <AdminPageStack>
      <AdminPageHeader
        title="Categories"
        description="Create or rename shop categories."
        action={
          <Button
            type="button"
            className="rounded-full"
            onClick={() => {
              setSelectedCategoryId("new");
              setEditorOpen(true);
            }}
          >
            New category
          </Button>
        }
      />
      <AdminPanel fill>
        <AdminCardToolbar>
          <AdminSearch value={q} onChange={setQ} label="Search categories" />
        </AdminCardToolbar>
        {(categories.data ?? []).length === 0 ? (
          <AdminEmpty>No categories yet.</AdminEmpty>
        ) : (
          <AdminTable>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paging.slice.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <AdminIdentity hint={category.slug}>{category.name}</AdminIdentity>
                  </TableCell>
                  <TableCell>{category.slug}</TableCell>
                  <TableCell className="hidden max-w-sm truncate md:table-cell">
                    {category.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <AdminIconButton
                      label={`Edit ${category.name}`}
                      onClick={() => {
                        setSelectedCategoryId(category.id);
                        setEditorOpen(true);
                      }}
                    >
                      <Pencil />
                    </AdminIconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AdminTable>
        )}
        {(categories.data ?? []).length === 0 ? null : (
          <AdminPagination
            page={paging.page}
            pageCount={paging.pageCount}
            start={paging.start}
            end={paging.end}
            total={paging.total}
            onPage={paging.setPage}
          />
        )}
      </AdminPanel>
      <CategoryEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        selectedId={selectedCategoryId}
        selected={selectedCategory}
        onSaved={refresh}
      />
    </AdminPageStack>
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
