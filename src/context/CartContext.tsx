import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AddToCartInput, Cart } from "@/types";
import { cartBackend } from "@/lib/cart";
import { linkCart, unlinkCart } from "@/lib/customer";
import { emptyCart } from "@/lib/shopify/transform";
import { useToast } from "./ToastContext";
import { useUser } from "./UserProvider";

/**
 * Thin React wrapper over the cart data layer (live Shopify or dev fixture).
 * It holds the Shopify-shaped `Cart` and forwards mutations to the backend —
 * it does NOT compute pricing, tax or shipping. Every total shown comes from
 * the backend's returned cart; final pricing is Shopify's at checkout.
 *
 * Mutations never reject: a failure is reported as a toast and the previous
 * cart is kept. Callers get a boolean so they can avoid showing success UI
 * (an "Added ✓" flash, a redirect to checkout) for something that failed.
 */
interface CartContextValue {
  cart: Cart;
  /** true once the persisted cart has hydrated */
  ready: boolean;
  itemCount: number;
  /** line ids with a mutation in flight — controls for these should disable */
  busyLines: string[];
  add: (input: AddToCartInput) => Promise<boolean>;
  updateQty: (lineId: string, quantity: number) => Promise<boolean>;
  remove: (lineId: string) => Promise<boolean>;
  clear: () => Promise<boolean>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(() => emptyCart());
  const [ready, setReady] = useState(false);
  const [busyLines, setBusyLines] = useState<string[]>([]);
  const { push } = useToast();
  const { ready: userReady, isAuthenticated } = useUser();

  /* Bumped by every mutation that lands. Hydrate captures the value it started
     with and bails if it changed, so a slow hydrate can't overwrite the result
     of an add the user made while it was still in flight. */
  const revisionRef = useRef(0);
  /* Cart mutations run one at a time. Shopify's cart is last-write-wins, so
     overlapping mutations can resolve out of order and leave the UI showing an
     older server state than what actually persisted. */
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  const applyCart = useCallback(
    (next: Cart) => {
      revisionRef.current += 1;
      setCart(next);
      // Shopify accepted the change but adjusted it (clamped to stock, etc).
      if (next.notice) push(next.notice);
    },
    [push],
  );

  const run = useCallback(
    (op: () => Promise<Cart>, fallback: string, lineId?: string): Promise<boolean> => {
      const task = queueRef.current.then(async () => {
        if (lineId) setBusyLines((prev) => (prev.includes(lineId) ? prev : [...prev, lineId]));
        try {
          applyCart(await op());
          return true;
        } catch (err) {
          /* Only messages the data layer wrote for customers are shown as-is;
             anything else is an HTTP status or a GraphQL payload. */
          const message = err instanceof Error && err.name === "CartError" ? err.message : fallback;
          console.error("Cart mutation failed:", err);
          push(message);
          return false;
        } finally {
          if (lineId) setBusyLines((prev) => prev.filter((id) => id !== lineId));
        }
      });
      queueRef.current = task;
      return task;
    },
    [applyCart, push],
  );

  useEffect(() => {
    let active = true;
    const revision = revisionRef.current;
    cartBackend
      .hydrate()
      .then((c) => {
        // A mutation landed while this was in flight; its cart is the newer one.
        if (!active || revisionRef.current !== revision) return;
        setCart(c);
      })
      .catch((err) => {
        console.error("Cart hydrate failed:", err);
        if (active) push("We couldn't load your saved cart. Refresh to try again.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [push]);

  /* Attach the signed-in customer to the Shopify cart so hosted checkout is
     account-aware; clear it on logout. The token stays server-side — this only
     asks the BFF to run the buyerIdentity mutation. Best-effort: a failure never
     blocks the cart (the fixture backend no-ops entirely). The ref keeps a guest
     who never signed in from firing a pointless unlink on every mount. */
  const wasAuthedRef = useRef(false);
  useEffect(() => {
    if (!userReady || !cart.id) return;
    if (isAuthenticated) void linkCart(cart.id);
    else if (wasAuthedRef.current) void unlinkCart(cart.id);
    wasAuthedRef.current = isAuthenticated;
  }, [userReady, isAuthenticated, cart.id]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      ready,
      itemCount: cart.totalQuantity,
      busyLines,
      add: (input) =>
        run(() => cartBackend.addLine(input), "We couldn't add that to your cart. Please try again."),
      updateQty: (lineId, quantity) => {
        /* Reflect the new quantity right away so a burst of stepper clicks each
           compute from the value the user sees rather than from the last server
           response — otherwise four fast clicks all send the same number. Money
           is deliberately left alone: this context never computes pricing, and
           the server's cart replaces these figures when the mutation lands. */
        setCart((prev) => {
          const lines = prev.lines.map((l) => (l.id === lineId ? { ...l, quantity } : l));
          return { ...prev, lines, totalQuantity: lines.reduce((n, l) => n + l.quantity, 0) };
        });
        return run(
          () => cartBackend.updateLine(lineId, quantity),
          "We couldn't update that quantity. Please try again.",
          lineId,
        );
      },
      remove: (lineId) =>
        run(
          () => cartBackend.removeLine(lineId),
          "We couldn't remove that item. Please try again.",
          lineId,
        ),
      clear: () => run(() => cartBackend.clear(), "We couldn't clear your cart. Please try again."),
    }),
    [cart, ready, busyLines, run],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
