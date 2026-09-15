import { createFileRoute } from "@tanstack/react-router";
import { CategoryCatalogue } from "@/components/admin/CatalogueManager";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { privatePageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => privatePageHead("Categories — TLB Admin", "Catalogue category management."),
  component: AdminCategoriesPage,
});

function AdminCategoriesPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Categories" description="Create or rename shop categories." />
      <CategoryCatalogue />
    </div>
  );
}
