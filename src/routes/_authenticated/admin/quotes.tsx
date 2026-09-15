import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useAdminQuotes } from "@/lib/queries/admin";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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
    <div className="space-y-6">
      <AdminPageHeader
        title="Quotes"
        description="Set quoted prices and status. Accepted is acknowledgement of price, not an order."
      />
      {quotes.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading quotes…</p>
      ) : quotes.error ? (
        <p className="text-sm text-muted-foreground">Could not load quotes. Please try again.</p>
      ) : (
        <QuoteWorkspace quotes={quotes.data ?? []} />
      )}
    </div>
  );
}
