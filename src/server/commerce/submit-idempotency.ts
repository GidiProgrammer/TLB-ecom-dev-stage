/**
 * In-memory replica of the Postgres claim/replay rules in
 * 20260913200000_tlb_commerce_submit_idempotency.sql.
 * Used so unit tests can cover nonce semantics without a live database.
 */

export type CommerceOperation = "order" | "quote";

export type CommerceSubmitResult =
  | { ok: true; replayed: boolean; entityId: string; reference: string }
  | { ok: false; error: string };

type Claim = {
  userId: string;
  operation: CommerceOperation;
  nonce: string;
  entityId: string | null;
  reference: string | null;
};

type Product = { id: string; name: string; price: number; stock: number; active: boolean };

export class IdempotentCommerceStore {
  claims = new Map<string, Claim>();
  orders = new Map<string, { id: string; userId: string; reference: string }>();
  quotes = new Map<string, { id: string; userId: string; reference: string }>();
  products = new Map<string, Product>();
  stockDecrements = 0;
  quotesCreated = 0;
  ordersCreated = 0;
  nextId = 1;

  seedProduct(product: Product) {
    this.products.set(product.id, { ...product });
  }

  private claim(userId: string, operation: CommerceOperation, nonce: string): Claim | { error: string } {
    if (!userId) return { error: "Unauthorized" };
    if (!nonce) return { error: "Invalid submission nonce" };

    const existing = this.claims.get(nonce);
    if (!existing) {
      const created: Claim = { userId, operation, nonce, entityId: null, reference: null };
      this.claims.set(nonce, created);
      return created;
    }
    if (existing.userId !== userId || existing.operation !== operation) {
      return { error: "Unauthorized" };
    }
    return existing;
  }

  submitOrder(
    userId: string,
    nonce: string,
    items: { product_id: string; quantity: number }[],
    failAfterClaim = false,
  ): CommerceSubmitResult {
    const snapshot = this.snapshot();
    try {
      const claim = this.claim(userId, "order", nonce);
      if ("error" in claim) return { ok: false, error: claim.error };
      if (claim.entityId && claim.reference) {
        return { ok: true, replayed: true, entityId: claim.entityId, reference: claim.reference };
      }
      if (!items.length) throw new Error("Cannot create an order with no items");
      if (failAfterClaim) throw new Error("simulated crash");

      for (const item of items) {
        const product = this.products.get(item.product_id);
        if (!product || !product.active) throw new Error("Product is not available");
        if (item.quantity <= 0) throw new Error("Invalid quantity");
        if (product.stock < item.quantity) throw new Error("Insufficient stock");
      }

      const id = `ord-${this.nextId++}`;
      const reference = `TLB-${id}`;
      for (const item of items) {
        const product = this.products.get(item.product_id)!;
        product.stock -= item.quantity;
        this.stockDecrements += 1;
      }
      this.orders.set(id, { id, userId, reference });
      this.ordersCreated += 1;
      claim.entityId = id;
      claim.reference = reference;
      return { ok: true, replayed: false, entityId: id, reference };
    } catch (error) {
      this.restore(snapshot);
      return { ok: false, error: error instanceof Error ? error.message : "failed" };
    }
  }

  submitQuote(
    userId: string,
    nonce: string,
    items: { product_id: string; quantity: number }[],
    failAfterClaim = false,
  ): CommerceSubmitResult {
    const snapshot = this.snapshot();
    try {
      const claim = this.claim(userId, "quote", nonce);
      if ("error" in claim) return { ok: false, error: claim.error };
      if (claim.entityId && claim.reference) {
        return { ok: true, replayed: true, entityId: claim.entityId, reference: claim.reference };
      }
      if (!items.length) throw new Error("Cannot create a quote with no items");
      if (failAfterClaim) throw new Error("simulated crash");

      for (const item of items) {
        const product = this.products.get(item.product_id);
        if (!product || !product.active) throw new Error("Product is not available");
        if (item.quantity <= 0) throw new Error("Invalid quantity");
      }

      const id = `qt-${this.nextId++}`;
      const reference = `QT-${id}`;
      this.quotes.set(id, { id, userId, reference });
      this.quotesCreated += 1;
      claim.entityId = id;
      claim.reference = reference;
      return { ok: true, replayed: false, entityId: id, reference };
    } catch (error) {
      this.restore(snapshot);
      return { ok: false, error: error instanceof Error ? error.message : "failed" };
    }
  }

  private snapshot() {
    return {
      claims: new Map(
        [...this.claims.entries()].map(([k, v]) => [k, { ...v }]),
      ),
      orders: new Map(this.orders),
      quotes: new Map(this.quotes),
      products: new Map([...this.products.entries()].map(([k, v]) => [k, { ...v }])),
      stockDecrements: this.stockDecrements,
      quotesCreated: this.quotesCreated,
      ordersCreated: this.ordersCreated,
      nextId: this.nextId,
    };
  }

  private restore(snapshot: ReturnType<IdempotentCommerceStore["snapshot"]>) {
    this.claims = snapshot.claims;
    this.orders = snapshot.orders;
    this.quotes = snapshot.quotes;
    this.products = snapshot.products;
    this.stockDecrements = snapshot.stockDecrements;
    this.quotesCreated = snapshot.quotesCreated;
    this.ordersCreated = snapshot.ordersCreated;
    this.nextId = snapshot.nextId;
  }
}
