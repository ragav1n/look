import type { ProductVariant } from "@/types";

/**
 * At or below this many units of a single size, the product page tells the
 * shopper how few are left. Shopify supplies the count; this only decides how
 * early we start repeating it back.
 *
 * Worth revisiting as the catalogue grows: the notice earns its keep by being
 * rare, so if most sizes start carrying it, lower this rather than leave a
 * scarcity line on every chip.
 */
export const LOW_STOCK_THRESHOLD = 10;

/** Per-order ceiling on the quantity stepper, independent of what's in stock. */
export const MAX_QTY_PER_ORDER = 10;

/**
 * Units left for the chosen variant, when that number is worth showing. Returns
 * undefined — meaning "say nothing" — in the three cases where a count would
 * mislead:
 *
 *   - Shopify reports no count (inventory untracked, or the token lacks the
 *     inventory scope), so we have nothing truthful to show;
 *   - the variant is sold out, which the existing out-of-stock line covers;
 *   - there's comfortably more stock than anyone would buy in one order.
 */
export function lowStockLeft(variant: ProductVariant | undefined): number | undefined {
  if (!variant?.availableForSale) return undefined;
  const left = variant.quantityAvailable;
  if (left == null || left <= 0 || left > LOW_STOCK_THRESHOLD) return undefined;
  return left;
}

/** Wording for the low-stock line. Reads correctly at 1 with no special case. */
export const lowStockNotice = (left: number): string => `Only ${left} left in stock`;

/**
 * Ceiling for the quantity stepper, so nobody picks 10 under an "Only 3 left in
 * stock" line. Stock only has a meaning per variant, so until one is resolved
 * there is nothing to cap against and the per-order limit stands on its own —
 * which costs nothing, since Add to Cart is disabled until a size is picked.
 *
 * This governs a single add, not the cart as a whole: two adds of 2 still make
 * a line of 4, and the cart's own stepper carries no stock cap. Shopify
 * validates the real thing and its `userErrors` surface as a toast.
 */
export function maxOrderableQty(variant: ProductVariant | undefined): number {
  const left = variant?.quantityAvailable;
  // A variant can be `availableForSale` at zero units when the store lets it
  // oversell, so a non-positive count means "no ceiling known", not "none left".
  if (left == null || left <= 0) return MAX_QTY_PER_ORDER;
  return Math.min(MAX_QTY_PER_ORDER, left);
}
