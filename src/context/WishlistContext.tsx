import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface WishlistContextValue {
  ids: string[];
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
  remove: (productId: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [stored, setIds] = useLocalStorage<string[]>("look.wishlist", []);

  /* useLocalStorage's try/catch covers a parse failure but not "parsed fine,
     wrong type". A non-array here — a schema change, a stray write — made
     ids.includes() throw during render of every ProductCard, blanking Home and
     Shop entirely. Normalise on read; writes always store an array. */
  const ids = useMemo(() => (Array.isArray(stored) ? stored : []), [stored]);
  const update = useCallback(
    (fn: (prev: string[]) => string[]) =>
      setIds((prev) => fn(Array.isArray(prev) ? prev : [])),
    [setIds],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      ids,
      has: (id) => ids.includes(id),
      toggle: (id) =>
        update((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
      remove: (id) => update((prev) => prev.filter((x) => x !== id)),
    }),
    [ids, update],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
