import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CartItem } from "@/types";
import { getProduct } from "@/data/products";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const FREE_SHIPPING_THRESHOLD = 1000;
const SHIPPING_FLAT = 49;
const TAX_RATE = 0.05;

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  shipping: number;
  taxes: number;
  total: number;
  add: (item: CartItem) => void;
  remove: (productId: string, color: string, size: string) => void;
  setQty: (productId: string, color: string, size: string, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const keyOf = (i: { productId: string; color: string; size: string }) =>
  `${i.productId}|${i.color}|${i.size}`;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useLocalStorage<CartItem[]>("look.cart", []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce(
      (sum, i) => sum + (getProduct(i.productId)?.price ?? 0) * i.qty,
      0,
    );
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
    const taxes = Math.round(subtotal * TAX_RATE);
    return {
      items,
      itemCount: items.reduce((n, i) => n + i.qty, 0),
      subtotal,
      shipping,
      taxes,
      total: subtotal + shipping + taxes,
      add: (item) =>
        setItems((prev) => {
          const existing = prev.find((i) => keyOf(i) === keyOf(item));
          return existing
            ? prev.map((i) => (keyOf(i) === keyOf(item) ? { ...i, qty: i.qty + item.qty } : i))
            : [...prev, item];
        }),
      remove: (productId, color, size) =>
        setItems((prev) => prev.filter((i) => keyOf(i) !== keyOf({ productId, color, size }))),
      setQty: (productId, color, size, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((i) => keyOf(i) !== keyOf({ productId, color, size }))
            : prev.map((i) =>
                keyOf(i) === keyOf({ productId, color, size }) ? { ...i, qty } : i,
              ),
        ),
      clear: () => setItems([]),
    };
  }, [items, setItems]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
