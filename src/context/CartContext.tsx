import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AddToCartInput, Cart } from "@/types";
import { cartBackend } from "@/lib/cart";
import { emptyCart } from "@/lib/shopify/transform";

/**
 * Thin React wrapper over the cart data layer (live Shopify or dev fixture).
 * It holds the Shopify-shaped `Cart` and forwards mutations to the backend —
 * it does NOT compute pricing, tax or shipping. Every total shown comes from
 * the backend's returned cart; final pricing is Shopify's at checkout.
 */
interface CartContextValue {
  cart: Cart;
  /** true once the persisted cart has hydrated */
  ready: boolean;
  itemCount: number;
  add: (input: AddToCartInput) => Promise<void>;
  updateQty: (lineId: string, quantity: number) => Promise<void>;
  remove: (lineId: string) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(() => emptyCart());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    cartBackend
      .hydrate()
      .then((c) => {
        if (active) setCart(c);
      })
      .catch(() => {
        /* keep empty cart on hydrate failure */
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      ready,
      itemCount: cart.totalQuantity,
      add: async (input) => setCart(await cartBackend.addLine(input)),
      updateQty: async (lineId, quantity) => setCart(await cartBackend.updateLine(lineId, quantity)),
      remove: async (lineId) => setCart(await cartBackend.removeLine(lineId)),
      clear: async () => setCart(await cartBackend.clear()),
    }),
    [cart, ready],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
