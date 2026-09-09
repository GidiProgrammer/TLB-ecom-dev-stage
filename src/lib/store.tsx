import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type LineItem = { id: string; qty: number };

type StoreState = {
  cart: LineItem[];
  quote: LineItem[];
  addToCart: (id: string, qty?: number) => void;
  setCartQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  addToQuote: (id: string, qty?: number) => void;
  setQuoteQty: (id: string, qty: number) => void;
  removeFromQuote: (id: string) => void;
  clearQuote: () => void;
  cartCount: number;
  quoteCount: number;
};

const StoreContext = createContext<StoreState | null>(null);

const KEY = "tlb-store-v1";

function readStorage(): { cart: LineItem[]; quote: LineItem[] } {
  if (typeof window === "undefined") return { cart: [], quote: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { cart: [], quote: [] };
    const parsed = JSON.parse(raw) as { cart?: LineItem[]; quote?: LineItem[] };
    return { cart: parsed.cart ?? [], quote: parsed.quote ?? [] };
  } catch {
    return { cart: [], quote: [] };
  }
}

function upsert(list: LineItem[], id: string, qty: number): LineItem[] {
  const found = list.find((l) => l.id === id);
  if (!found) return [...list, { id, qty }];
  return list.map((l) => (l.id === id ? { ...l, qty: l.qty + qty } : l));
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<LineItem[]>([]);
  const [quote, setQuote] = useState<LineItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initial = readStorage();
    setCart(initial.cart);
    setQuote(initial.quote);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(KEY, JSON.stringify({ cart, quote }));
  }, [cart, quote, hydrated]);

  const addToCart = useCallback((id: string, qty = 1) => setCart((c) => upsert(c, id, qty)), []);
  const addToQuote = useCallback((id: string, qty = 1) => setQuote((q) => upsert(q, id, qty)), []);

  const value = useMemo<StoreState>(
    () => ({
      cart,
      quote,
      addToCart,
      addToQuote,
      setCartQty: (id, qty) =>
        setCart((c) => (qty <= 0 ? c.filter((l) => l.id !== id) : c.map((l) => (l.id === id ? { ...l, qty } : l)))),
      removeFromCart: (id) => setCart((c) => c.filter((l) => l.id !== id)),
      clearCart: () => setCart([]),
      setQuoteQty: (id, qty) =>
        setQuote((q) => (qty <= 0 ? q.filter((l) => l.id !== id) : q.map((l) => (l.id === id ? { ...l, qty } : l)))),
      removeFromQuote: (id) => setQuote((q) => q.filter((l) => l.id !== id)),
      clearQuote: () => setQuote([]),
      cartCount: cart.reduce((n, l) => n + l.qty, 0),
      quoteCount: quote.reduce((n, l) => n + l.qty, 0),
    }),
    [cart, quote, addToCart, addToQuote],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
