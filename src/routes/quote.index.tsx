import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatGHS } from "@/lib/catalog-utils";
import { fetchProductBySlug, useProduct } from "@/lib/queries/products";
import { useStore, type LineItem } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { commerceConfirmationPath, parseQuoteReference } from "@/lib/commerce-confirmation";
import { createQuote } from "@/lib/quotes";
import { clearSubmissionNonce, getOrCreateSubmissionNonce } from "@/lib/commerce-nonce";
import { clearFormDraft } from "@/lib/form-draft";
import { usePreservedContactForm } from "@/lib/use-contact-draft";
import { useAccountProfile } from "@/lib/queries/account";
import { LineQuantityInput } from "@/components/site/LineQuantityInput";
import { privatePageHead } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/quote/")({
  head: () =>
    privatePageHead(
      "Request a quote — TLB Enterprise",
      "Build a list of laboratory products and request a quotation from TLB Enterprise in Accra.",
    ),
  component: QuotePage,
});

const QUOTE_DRAFT = "quote";

function QuoteLine({
  line,
  setQuoteQty,
  removeFromQuote,
}: {
  line: LineItem;
  setQuoteQty: (id: string, qty: number) => void;
  removeFromQuote: (id: string) => void;
}) {
  const { data: p, isLoading, error } = useProduct(line.id);

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 p-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    );
  }

  if (error || !p) {
    const label = line.id.replace(/-/g, " ");
    return (
      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium capitalize">{label}</p>
          <p className="text-sm text-destructive" role="status">
            This product is no longer available. Remove it before submitting the quote request.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => removeFromQuote(line.id)}>
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <Link to="/product/$id" params={{ id: p.id }} className="font-display text-sm font-bold hover:text-primary">
          {p.name}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          list {formatGHS(p.price)}
          {p.unit ? ` / ${p.unit}` : ""}
        </p>
      </div>
      <LineQuantityInput
        label={`Quantity for ${p.name}`}
        value={line.qty}
        onCommit={(quantity) => setQuoteQty(line.id, quantity)}
      />
      <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => removeFromQuote(line.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function QuotePage() {
  const { quote, setQuoteQty, removeFromQuote, clearQuote } = useStore();
  const { user, loading: authLoading } = useAuth();
  const profile = useAccountProfile(user?.id);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const lineQueries = useQueries({
    queries: quote.map((line) => ({
      queryKey: ["product", line.id],
      queryFn: () => fetchProductBySlug(line.id),
      enabled: Boolean(line.id),
    })),
  });
  const [form, setForm] = usePreservedContactForm(
    QUOTE_DRAFT,
    {
      name: "",
      email: "",
      phone: "",
      institution: "",
      notes: "",
    },
    {
      authLoading,
      profile: profile.data,
      profileLoading: Boolean(user?.id) && profile.isLoading,
      email: user?.email,
    },
  );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const linesLoading = lineQueries.some((q) => q.isLoading);
  const linesMissing = quote.some((_, i) => {
    const query = lineQueries[i];
    return !query || (!query.isLoading && !query.data);
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quote.length === 0) {
      toast.error("Add at least one product to your quote request");
      return;
    }
    if (!user) {
      toast.error("Please sign in to submit a quote request");
      navigate({ to: "/auth", search: { redirect: "/quote" } });
      return;
    }
    setBusy(true);
    setSubmitError(null);
    const submissionNonce = getOrCreateSubmissionNonce("quote");
    try {
      const quoteItems = quote.flatMap((l, i) => {
        const p = lineQueries[i]?.data;
        return p ? [{ product_id: p.productId, quantity: l.qty }] : [];
      });
      if (quoteItems.length !== quote.length) {
        throw new Error("Some products in your quote list could not be loaded. Please refresh and try again.");
      }

      const { reference } = await createQuote({
        data: {
          userId: user.id,
          submissionNonce,
          institution: form.institution.trim() ? form.institution.trim() : null,
          contact: {
            name: form.name,
            email: form.email,
            phone: form.phone,
          },
          notes: form.notes.trim() ? form.notes.trim() : undefined,
          items: quoteItems,
        },
      });

      const parsed = parseQuoteReference(reference);
      const confirmation = parsed ? commerceConfirmationPath("quote", parsed) : null;
      if (!parsed || !confirmation) {
        throw new Error("Quote was created but the confirmation link could not be opened. Check your account.");
      }
      clearSubmissionNonce("quote");
      clearFormDraft(QUOTE_DRAFT);
      clearQuote();
      toast.success(`Quote request ${parsed} submitted`, {
        description: "We typically respond within one working day.",
      });
      await navigate({ to: "/quote/confirmed", search: { ref: parsed } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Quote creation failed";
      setSubmitError(message);
      toast.error("Could not submit request", { description: message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Request a quote</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Add the products you need and tell us the quantities. Our team will review the request and provide
        pricing. This is not an invoice and no payment is taken online.
      </p>
      {!user ? (
        <div className="mt-6 rounded-md border border-border bg-primary-soft px-4 py-3 text-sm">
          <p className="font-semibold">Sign in to submit a quote request.</p>
          <p className="mt-1 text-muted-foreground">Your list and contact details stay on this device until you return.</p>
          <Button asChild size="sm" className="mt-3">
            <Link to="/auth" search={{ redirect: "/quote" }}>
              Sign in
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          <h2 className="font-display text-base font-bold">Items requested</h2>
          {quote.length === 0 ? (
            <div className="mt-3 rounded-md border border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Your quote list is empty. Add items from the catalogue using the quote button on any product.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link to="/shop">Browse products</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-3 divide-y divide-border rounded-md border border-border">
              {quote.map((line) => (
                <QuoteLine
                  key={line.id}
                  line={line}
                  setQuoteQty={setQuoteQty}
                  removeFromQuote={removeFromQuote}
                />
              ))}
            </div>
          )}
          {quote.length > 0 && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={clearQuote}>
              Clear list
            </Button>
          )}
        </div>

        <form onSubmit={submit} className="h-fit space-y-4 rounded-md border border-border bg-card p-5">
          {submitError ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <p className="font-semibold">Your quote request was not submitted</p>
              <p className="mt-1">{submitError}</p>
              <p className="mt-1 text-destructive/80">Your list and form details have been kept. You can correct the issue and try again.</p>
            </div>
          ) : null}
          {linesMissing ? (
            <div role="status" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              A product in your quote list is no longer available. Remove it before submitting the quote request.
            </div>
          ) : null}
          <h2 className="font-display text-base font-bold">Your details</h2>
          <div>
            <Label htmlFor="q-name">Contact name</Label>
            <Input id="q-name" autoComplete="name" required value={form.name} onChange={set("name")} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="q-email">Email</Label>
            <Input id="q-email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="q-phone">Phone</Label>
            <Input id="q-phone" type="tel" autoComplete="tel" required value={form.phone} onChange={set("phone")} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="q-inst">Institution / company</Label>
            <Input id="q-inst" autoComplete="organization" value={form.institution} onChange={set("institution")} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="q-notes">Notes</Label>
            <Textarea
              id="q-notes"
              rows={4}
              placeholder="Delivery deadline, tender reference, packaging requirements…"
              value={form.notes}
              onChange={set("notes")}
              className="mt-1.5"
            />
          </div>
          <Button
            type="submit"
            disabled={!user || quote.length === 0 || busy || linesLoading || linesMissing}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {busy ? "Submitting…" : "Submit quote request"}
          </Button>
          {!user && (
            <p className="text-xs text-muted-foreground">
              <Link to="/auth" search={{ redirect: "/quote" }} className="font-semibold text-primary hover:underline">
                Sign in
              </Link>{" "}
              to submit and track your quote requests.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
