import type { Promo } from "@/types";
import { getPromo } from "@/lib/catalog";
import { fallbackPromo } from "@/config/launchOffer";
import { useAsyncData } from "./useAsyncData";

/* One request per page load, shared by the offer bar, the ticker, the poster
   and the cart.

   The promise is memoised at module scope rather than held in a context: four
   consumers in two subtrees would otherwise be four identical Storefront round
   trips, and a provider buys nothing beyond that — the value never changes once
   it resolves, so there is nothing to re-render on.

   A failed lookup resolves to the built-in campaign instead of rejecting. An
   offline shopper, or one whose request Shopify rate-limited, should still see
   the campaign the site shipped with; `getPromo` already makes the same call
   for an empty result. */
let pending: Promise<Promo | null> | null = null;

export function loadPromo(): Promise<Promo | null> {
  pending ??= getPromo().catch((err) => {
    console.warn("Promo lookup failed, falling back to the built-in campaign:", err);
    return fallbackPromo();
  });
  return pending;
}

/** The live promotion, or null both while it loads and when there isn't one.
 *
 *  Those two being the same value is deliberate: every surface renders nothing
 *  for a null promo, so a store with no campaign never flashes one, and a store
 *  with one pays a single paint for it. Check `promo.surfaces` before rendering
 *  — a live promo is not automatically allowed on your surface. */
export function usePromo(): Promo | null {
  return useAsyncData(loadPromo, []).data ?? null;
}
