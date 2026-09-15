import { createFileRoute } from "@tanstack/react-router";
import { CategoryCatalogue } from "@/components/admin/CatalogueManager";
import { privatePageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => privatePageHead("Categories — TLB Admin", "Catalogue category management."),
  component: AdminCategoriesPage,
});

function AdminCategoriesPage() {
  return <CategoryCatalogue />;
}
