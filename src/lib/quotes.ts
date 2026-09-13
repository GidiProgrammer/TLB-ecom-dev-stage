import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const quoteInputSchema = z.object({
  userId: z.string().uuid(),
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
      .select("id, reference, contact_email")
      .eq("id", quoteId)
      .maybeSingle();

    const created = {
      quoteId,
      reference: quote?.reference ?? String(payload.reference),
    };

    const { enqueueQuoteCreatedFromRecord, notifyAfterCommerceCommit } = await import(
      "@/server/mail/commerce"
    );

    return notifyAfterCommerceCommit(created, () =>
      enqueueQuoteCreatedFromRecord({
        id: quoteId,
        reference: created.reference,
        contactEmail: quote?.contact_email ?? null,
      }),
    );
  });
