import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertValidQuoteTransition } from "@/lib/commerce-status";

const quoteInputSchema = z.object({
  userId: z.string().uuid(),
  submissionNonce: z.string().uuid(),
  institution: z.string().trim().max(200).nullable(),
  contact: z.object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().min(1).max(50),
  }),
  notes: z.string().trim().max(2000).optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

function mapQuoteError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("unauthorized")) return "Unauthorized";
  if (lower.includes("no items") || lower.includes("empty quote")) return "Empty quote";
  if (lower.includes("not found") || lower.includes("not available") || lower.includes("invalid product")) {
    return "Invalid product";
  }
  if (lower.includes("invalid quantity") || lower.includes("quantity")) return "Invalid quantity";
  return "Quote creation failed";
}

export const createQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => quoteInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (data.userId !== context.userId) {
      throw new Error("Unauthorized");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: result, error } = await supabaseAdmin.rpc("create_quote_with_items", {
      p_user_id: context.userId,
      p_institution: data.institution ?? "",
      p_contact_name: data.contact.name,
      p_contact_email: data.contact.email,
      p_contact_phone: data.contact.phone,
      p_notes: data.notes ?? "",
      p_items: data.items,
      p_submission_nonce: data.submissionNonce,
    });

    if (error) {
      console.error("[createQuote]", error.message);
      throw new Error(mapQuoteError(error.message));
    }

    const payload = result as { quote_id?: string; reference?: string } | null;
    if (!payload?.quote_id || !payload.reference) {
      throw new Error("Quote creation failed");
    }

    const quoteId = String(payload.quote_id);
    const { data: quote } = await supabaseAdmin
      .from("quotes")
      .select("id, reference, contact_email, user_id")
      .eq("id", quoteId)
      .maybeSingle();

    if (quote?.user_id && quote.user_id !== context.userId) {
      throw new Error("Unauthorized");
    }

    const created = {
      quoteId,
      reference: quote?.reference ?? String(payload.reference),
    };

    const { enqueueQuoteCreatedFromRecord, notifyAfterCommerceCommit } = await import(
      "@/server/mail/commerce"
    );
    const { createQuoteSubmittedNotification, runAfterCommerceCommit } = await import(
      "@/server/notifications/commerce"
    );

    return notifyAfterCommerceCommit(created, () =>
      runAfterCommerceCommit([
        {
          channel: "transactional-email",
          run: () =>
            enqueueQuoteCreatedFromRecord({
              id: quoteId,
              reference: created.reference,
              contactEmail: quote?.contact_email ?? null,
            }),
        },
        {
          channel: "customer-notifications",
          run: () =>
            createQuoteSubmittedNotification({
              id: quoteId,
              userId: quote?.user_id ?? context.userId,
              reference: created.reference,
            }),
        },
      ]),
    );
  });

const acceptQuoteSchema = z.object({
  quoteId: z.string().uuid(),
});

export const acceptQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => acceptQuoteSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: loadError } = await supabaseAdmin
      .from("quotes")
      .select("id, reference, status, user_id")
      .eq("id", data.quoteId)
      .maybeSingle();

    if (loadError) {
      console.error("[acceptQuote]", loadError.message);
      throw new Error("Could not accept quotation");
    }
    if (!existing) {
      throw new Error("Quote not found");
    }
    if (existing.user_id !== context.userId) {
      throw new Error("Unauthorized");
    }

    assertValidQuoteTransition(existing.status, "accepted");

    const { data: payload, error } = await supabaseAdmin.rpc("accept_quote", {
      p_quote_id: data.quoteId,
    });

    if (error) {
      console.error("[acceptQuote]", error.message);
      const lower = error.message.toLowerCase();
      if (lower.includes("cannot be accepted")) throw new Error("This quotation cannot be accepted yet");
      if (lower.includes("not found")) throw new Error("Quote not found");
      throw new Error("Could not accept quotation");
    }

    const result = payload as {
      quote_id?: string;
      reference?: string;
      status?: string;
      replayed?: boolean;
    } | null;

    if (!result?.quote_id || result.status !== "accepted") {
      throw new Error("Could not accept quotation");
    }

    return {
      quoteId: String(result.quote_id),
      reference: String(result.reference ?? existing.reference),
      status: "accepted" as const,
      replayed: Boolean(result.replayed),
    };
  });
