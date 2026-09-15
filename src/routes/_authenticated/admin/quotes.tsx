import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useAdminQuotes } from "@/lib/queries/admin";
import { AdminLoading, AdminPageHeader, AdminPageStack } from "@/components/admin/AdminPageHeader";
import { QuoteWorkspace } from "@/components/admin/QuoteWorkspace";
import { privatePageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/quotes")({
  head: () => privatePageHead("Quotes — TLB Admin", "Organisation-wide quotation requests."),
  component: AdminQuotesPage,
});

function AdminQuotesPage() {
  const { user } = useAuth();
  const quotes = useAdminQuotes(user?.id);

  return (
    <AdminPageStack>
      <AdminPageHeader
        title="Quotes"
        description="Set quoted prices and status. Accepted is acknowledgement of price, not an order."
      />
      {quotes.isLoading ? (
        <AdminLoading label="Loading quotes" />
      ) : quotes.error ? (
        <p className="text-sm text-muted-foreground">Could not load quotes. Please try again.</p>
      ) : (
        <QuoteWorkspace quotes={quotes.data ?? []} />
      )}
    </AdminPageStack>
  );
}
