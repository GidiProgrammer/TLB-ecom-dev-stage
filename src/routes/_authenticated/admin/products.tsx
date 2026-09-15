import { createFileRoute } from "@tanstack/react-router";
import { ProductCatalogue } from "@/components/admin/CatalogueManager";
import { privatePageHead } from "@/lib/seo";
import { Route as AdminRoute } from "./route";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => privatePageHead("Products — TLB Admin", "Catalogue product management."),
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const { access } = AdminRoute.useRouteContext();
  return <ProductCatalogue canRestore={access.isAdmin} />;
}
