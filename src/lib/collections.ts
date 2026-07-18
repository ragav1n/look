/**
 * Shared vocabulary for collection handles.
 *
 * Shopify handles are typed by hand in the admin and drift from the filter keys
 * the Shop page uses ("bottom" vs "bottoms", "coords" vs "co-ords"). Both the
 * Shop sidebar and anything that *links into* it must fold handles the same way,
 * otherwise a link can filter correctly while leaving the sidebar unhighlighted.
 */

/** Collection handles that aren't shop categories — merchandising devices that
 *  should never surface as a browsable tile. */
export const NON_CATEGORY_COLLECTIONS = new Set(["hero", "frontpage"]);

/** Handle → canonical filter key. */
const COL_ALIASES: Record<string, string> = {
  bottom: "bottoms",
  top: "tops",
  dress: "dresses",
  gown: "dresses",
  gowns: "dresses",
  coords: "co-ords",
  "co-ord": "co-ords",
  "new-arrival": "new-arrivals",
};

export const canonical = (s: string): string => {
  const k = s.trim().toLowerCase();
  return COL_ALIASES[k] ?? k;
};
