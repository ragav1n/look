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
 * Ceiling for a quantity stepper, so nobody picks 10 under an "Only 3 left in
 * stock" line. Takes the bare count rather than a variant because the cart
 * asks the same question about a line it has already added.
 *
 * Stock only means anything per variant, so before one is resolved there is
 * nothing to cap against and the per-order limit stands alone — which costs
 * nothing on the PDP, where Add to Cart is disabled until a size is picked.
 *
 * Still a per-stepper guard, not a cart-wide one: adding 2 twice from the
 * product page makes a line of 4. Shopify validates the real thing at
 * checkout, and its `userErrors` surface as a toast.
 */
export function maxOrderableQty(quantityAvailable: number | undefined): number {
  // A variant can be `availableForSale` at zero units when the store lets it
  // oversell, so a non-positive count means "no ceiling known", not "none left".
  if (quantityAvailable == null || quantityAvailable <= 0) return MAX_QTY_PER_ORDER;
  return Math.min(MAX_QTY_PER_ORDER, quantityAvailable);
}
