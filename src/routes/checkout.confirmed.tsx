import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ConfirmationFound, ConfirmationMissing } from "@/components/site/CommerceConfirmation";
import { useAuth } from "@/hooks/useAuth";
import { commerceConfirmationPath, parseConfirmationSearch } from "@/lib/commerce-confirmation";
import { fetchOwnedOrderByReference } from "@/lib/queries/account";
import { privatePageHead } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checkout/confirmed")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => parseConfirmationSearch("order", search),
  beforeLoad: async ({ search }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const confirmation = search.ref ? commerceConfirmationPath("order", search.ref) : null;
      throw redirect({
        to: "/auth",
        search: { redirect: confirmation ?? "/account" },
      });
    }
  },
  head: () =>
    privatePageHead(
      "Order confirmed — TLB Enterprise",
      "Your laboratory supply order was submitted. Keep your order reference for follow-up.",
    ),
  component: CheckoutConfirmed,
});

function CheckoutConfirmed() {
  const { ref } = Route.useSearch();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["owned-order", user?.id, ref],
    enabled: Boolean(user?.id && ref),
    queryFn: () => fetchOwnedOrderByReference(ref!),
  });

  if (!ref) {
    return (
      <ConfirmationMissing title="Order confirmation not found">
        That confirmation link is missing or invalid. Sign in and open your account to find recent orders.
      </ConfirmationMissing>
    );
  }

  if (query.isLoading) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-sm text-muted-foreground">Loading your order confirmation…</p>
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <ConfirmationMissing title="Order confirmation not found">
        We could not show that order confirmation. If you just placed an order, open your account to
        find the reference.
      </ConfirmationMissing>
    );
  }

  return (
    <ConfirmationFound heading="Order confirmed" accountLabel="View your orders">
      Your order was submitted successfully. Keep this reference: {query.data.reference}. You can also
      find it in your account. No payment was taken online — we will confirm availability, delivery
      cost and invoicing separately.
    </ConfirmationFound>
  );
}
