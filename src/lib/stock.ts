/**
 * At or below this many units of a single size, the storefront tells the shopper
 * how few are left. Shopify supplies the count; this only decides how early we
 * start repeating it back.
 *
 * Worth revisiting as the catalogue grows: the notice earns its keep by being
 * rare, so if most sizes start carrying it, lower this rather than leave a
 * scarcity line on every chip.
 */
export const LOW_STOCK_THRESHOLD = 10;

/** Per-order ceiling for one variant, independent of what's in stock. */
export const MAX_QTY_PER_ORDER = 10;

/**
 * Units left, when that number is worth showing. Returns undefined — meaning
 * "say nothing" — in the two cases where a count would mislead: Shopify reports
 * none (inventory untracked, or the token lacks the inventory scope), or there
 * is comfortably more than anyone would buy in one order.
 *
 * Takes the bare count rather than a variant so the cart, which holds a line
 * and not a variant, can ask the same question. Callers holding a variant are
 * responsible for the sold-out case, which has its own wording.
 */
export function lowStockLeft(quantityAvailable: number | undefined): number | undefined {
  if (quantityAvailable == null || quantityAvailable <= 0) return undefined;
  return quantityAvailable <= LOW_STOCK_THRESHOLD ? quantityAvailable : undefined;
}

/** Wording for the low-stock line. Reads correctly at 1 with no special case. */
export const lowStockNotice = (left: number): string => `Only ${left} left in stock`;

/**
 * The most of one variant a cart may hold, so nobody ends up with 10 under an
 * "Only 3 left in stock" line. This is a total, not a per-add allowance: the
 * product page, the add itself and the cart's own stepper all measure against
 * this same number, which is what stops two adds of 2 becoming a line of 4.
 *
 * Stock only means anything per variant, so before one is resolved there is
 * nothing to cap against and the per-order limit stands alone. That costs
 * nothing on the product page, where Add to Cart is disabled until a size is
 * picked.
 */
export function maxOrderableQty(quantityAvailable: number | undefined): number {
  // A variant can be `availableForSale` at zero units when the store lets it
  // oversell, so a non-positive count means "no ceiling known", not "none left".
  if (quantityAvailable == null || quantityAvailable <= 0) return MAX_QTY_PER_ORDER;
  return Math.min(MAX_QTY_PER_ORDER, quantityAvailable);
}

/** How many more of a variant the cart can take, given what it already holds. */
export function roomToAdd(quantityAvailable: number | undefined, alreadyInCart: number): number {
  return Math.max(0, maxOrderableQty(quantityAvailable) - alreadyInCart);
}

/** Whether the shelf, rather than the per-order limit, is the binding one. */
const limitedByStock = (quantityAvailable: number | undefined): boolean =>
  quantityAvailable != null && quantityAvailable > 0 && quantityAvailable <= MAX_QTY_PER_ORDER;

/**
 * Explains a capped add. Names the real reason rather than blaming stock for
 * the per-order limit — claiming "all 10 we have left" on a variant with 40 in
 * the back would be a lie the shopper could catch.
 *
 * `added` is how many actually went in, so 0 reads as a refusal and anything
 * higher as a partial.
 */
export function cartLimitNotice(quantityAvailable: number | undefined, added: number): string {
  const ceiling = maxOrderableQty(quantityAvailable);
  const limit = limitedByStock(quantityAvailable)
    ? `all ${ceiling} we have left`
    : `the ${ceiling} we allow per item`;
  return added > 0
    ? `We added ${added}. Your cart now has ${limit}.`
    : `Your cart already has ${limit}.`;
}
