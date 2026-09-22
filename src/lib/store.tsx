import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { parseStoredCommerce, type LineItem } from "@/lib/store-storage";

export type { LineItem };

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
    return parseStoredCommerce(window.localStorage.getItem(KEY));
  } catch {
    return { cart: [], quote: [] };
  }
}

function normalizeAddQty(qty: number): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.max(1, Math.floor(qty));
}

function upsert(list: LineItem[], id: string, qty: number): LineItem[] {
  const amount = normalizeAddQty(qty);
  const found = list.find((l) => l.id === id);
  if (!found) return [...list, { id, qty: amount }];
  return list.map((l) => (l.id === id ? { ...l, qty: l.qty + amount } : l));
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<LineItem[]>([]);
  const [quote, setQuote] = useState<LineItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const mutatedBeforeHydrate = useRef(false);

  useEffect(() => {
    const initial = readStorage();
    setCart((current) => (mutatedBeforeHydrate.current ? current : initial.cart));
    setQuote((current) => (mutatedBeforeHydrate.current ? current : initial.quote));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(KEY, JSON.stringify({ cart, quote }));
  }, [cart, quote, hydrated]);

  const addToCart = useCallback((id: string, qty = 1) => {
    mutatedBeforeHydrate.current = true;
    setCart((c) => upsert(c, id, qty));
  }, []);
  const addToQuote = useCallback((id: string, qty = 1) => {
    mutatedBeforeHydrate.current = true;
    setQuote((q) => upsert(q, id, qty));
  }, []);

  const value = useMemo<StoreState>(
    () => ({
      cart,
      quote,
      addToCart,
      addToQuote,
      setCartQty: (id, qty) => {
        mutatedBeforeHydrate.current = true;
        setCart((c) => {
          if (!Number.isFinite(qty) || qty <= 0) return c.filter((l) => l.id !== id);
          return c.map((l) => (l.id === id ? { ...l, qty: Math.floor(qty) } : l));
        });
      },
      removeFromCart: (id) => {
        mutatedBeforeHydrate.current = true;
        setCart((c) => c.filter((l) => l.id !== id));
      },
      clearCart: () => {
        mutatedBeforeHydrate.current = true;
        setCart([]);
      },
      setQuoteQty: (id, qty) => {
        mutatedBeforeHydrate.current = true;
        setQuote((q) => {
          if (!Number.isFinite(qty) || qty <= 0) return q.filter((l) => l.id !== id);
          return q.map((l) => (l.id === id ? { ...l, qty: Math.floor(qty) } : l));
        });
      },
      removeFromQuote: (id) => {
        mutatedBeforeHydrate.current = true;
        setQuote((q) => q.filter((l) => l.id !== id));
      },
      clearQuote: () => {
        mutatedBeforeHydrate.current = true;
        setQuote([]);
      },
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
