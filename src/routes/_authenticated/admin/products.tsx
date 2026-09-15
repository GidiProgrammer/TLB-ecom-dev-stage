import { createFileRoute } from "@tanstack/react-router";
import { ProductCatalogue } from "@/components/admin/CatalogueManager";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { privatePageHead } from "@/lib/seo";
import { Route as AdminRoute } from "./route";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => privatePageHead("Products — TLB Admin", "Catalogue product management."),
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const { access } = AdminRoute.useRouteContext();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Products"
        description="Table-first catalogue editing. Stock on hand is shown for reference and is not edited as a raw field."
      />
      <ProductCatalogue canRestore={access.isAdmin} />
    </div>
  );
}
