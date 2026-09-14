import type { QuoteStatus } from "../../lib/commerce-status.ts";
import { assertValidQuoteTransition, isQuoteCustomerAcceptable } from "../../lib/commerce-status.ts";

type Quote = {
  id: string;
  userId: string;
  status: QuoteStatus;
  reference: string;
};

export class QuoteAcceptStore {
  quotes = new Map<string, Quote>();
  ordersCreated = 0;
  stockDecrements = 0;
  restocks = 0;
  stockMovements = 0;
  commerceSubmissions = 0;
  private locks = new Set<string>();

  seedQuote(quote: Quote) {
    this.quotes.set(quote.id, { ...quote });
  }

  private withLock<T>(quoteId: string, fn: () => T): T {
    if (this.locks.has(quoteId)) throw new Error("lock busy");
    this.locks.add(quoteId);
    try {
      return fn();
    } finally {
      this.locks.delete(quoteId);
    }
  }

  accept(
    actorId: string,
    quoteId: string,
  ): { ok: true; replayed: boolean; status: QuoteStatus; reference: string } | { ok: false; error: string } {
    if (!actorId) return { ok: false, error: "Unauthorized" };
    try {
      return this.withLock(quoteId, () => {
        const quote = this.quotes.get(quoteId);
        if (!quote) return { ok: false, error: "Quote not found" };
        if (quote.userId !== actorId) return { ok: false, error: "Unauthorized" };
        if (quote.status === "accepted") {
          return { ok: true, replayed: true, status: "accepted", reference: quote.reference };
        }
        try {
          assertValidQuoteTransition(quote.status, "accepted");
        } catch {
          return { ok: false, error: "Quote cannot be accepted" };
        }
        if (!isQuoteCustomerAcceptable(quote.status)) {
          return { ok: false, error: "Quote cannot be accepted" };
        }
        quote.status = "accepted";
        return { ok: true, replayed: false, status: "accepted", reference: quote.reference };
      });
    } catch {
      return { ok: false, error: "lock busy" };
    }
  }
}
