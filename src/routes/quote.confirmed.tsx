import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ConfirmationFound, ConfirmationMissing } from "@/components/site/CommerceConfirmation";
import { useAuth } from "@/hooks/useAuth";
import { accountHistorySearch, commerceConfirmationPath, parseConfirmationSearch } from "@/lib/commerce-confirmation";
import { AccountQuoteCard } from "@/components/site/AccountQuoteCard";
import { fetchOwnedQuoteByReference } from "@/lib/queries/account";
import { privatePageHead } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/quote/confirmed")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => parseConfirmationSearch("quote", search),
  beforeLoad: async ({ search }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const confirmation = search.ref ? commerceConfirmationPath("quote", search.ref) : null;
      throw redirect({
        to: "/auth",
        search: { redirect: confirmation ?? "/account" },
      });
    }
  },
  head: () =>
    privatePageHead(
      "Quote request received — TLB Enterprise",
      "Your quotation request was submitted. Keep your quote reference for follow-up.",
    ),
  component: QuoteConfirmed,
});

function QuoteConfirmed() {
  const { ref } = Route.useSearch();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["owned-quote", user?.id, ref],
    enabled: Boolean(user?.id && ref),
    queryFn: () => fetchOwnedQuoteByReference(ref!, user!.id),
  });

  if (!ref) {
    return (
      <ConfirmationMissing title="Quote confirmation not found">
        That confirmation link is missing or invalid. Sign in and open your account to find recent quote
        requests.
      </ConfirmationMissing>
    );
  }

  if (query.isLoading) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-sm text-muted-foreground">Loading your quote confirmation…</p>
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <ConfirmationMissing title="Quote confirmation not found">
        We could not show that quote confirmation. If you just submitted a request, open your account
        to find the reference.
      </ConfirmationMissing>
    );
  }

  return (
    <ConfirmationFound
      heading="Quote request received"
      accountLabel="View your quote requests"
      accountSearch={accountHistorySearch("quote", query.data.reference)}
    >
      <p className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
        Your quote request was received. Keep this reference: {query.data.reference}. You can find it
        later in your account under quote requests. TLB will review the list and provide pricing.
      </p>
      <AccountQuoteCard quote={query.data} forceOpen />
    </ConfirmationFound>
  );
}
