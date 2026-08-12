import type { Promo } from "@/types";

/** The built-in campaign — the fallback the `promo` metaobject stands in front of.
 *
 *  Promotions are Shopify's to own now (Settings → Custom data → Metaobjects →
 *  Promo, read by `getPromo`). This file exists for exactly two situations:
 *  the store has no `promo` entries yet, and the Storefront lookup failed. In
 *  both, the site keeps showing the campaign it shipped with instead of going
 *  quiet. The moment ONE entry exists, Shopify is authoritative — including
 *  "every entry switched off", which genuinely retires the promo. See getPromo
 *  for why empty-vs-non-empty is the distinction that matters.
 *
 *  Creating a discount in Shopify does NOT put it on the site: it needs a promo
 *  entry, and that entry needs the surface ticked. See docs/shopify.md.
 *
 *  The code is written LOOK@12 in caps everywhere, including in the ticker and
 *  the poster the client's artwork lowercased. Shopify matches discount codes
 *  case-insensitively, so both work at checkout, but a code shown in two
 *  different casings invites a shopper to wonder which one is the real one.
 *
 *  Retiring this file for good: create the metaobject, then delete the file
 *  along with the fallback branch in `getPromo` and its fixture twin. */
const LIVE = true;

/** The site's own address, printed as the poster's credit line. Not campaign
 *  data — it doesn't change when the offer does, so it isn't a promo field. */
export const POSTER_DOMAIN = "look.ind.in";

export const FALLBACK_PROMO: Promo = {
  code: "LOOK@12",
  /* Deliberately NOT the wording the `promo` metaobject carries. This line is
     the one cheap way to tell, from the front of the site, whether Shopify is
     being read at all: see this and the lookup came back empty or failed. Keep
     it shopper-ready rather than a debug string — a shopper is who sees it when
     the Storefront is unreachable — but don't re-sync it with the admin copy. */
  barText: "Shop the launch offer while it lasts",
  tickerText: "LOOK goes live",
  /* Poster copy, as supplied by the client. */
  headline: "Go Live",
  script: "Sale",
  lines: ["First Click, Best Deal", "Website launch offer is LIVE"],
  ctaPath: "/shop",
  /* Every surface the launch campaign shipped on. A Shopify-authored promo
     starts with all of these OFF and the admin ticks what it wants. */
  surfaces: { bar: true, ticker: true, poster: true, cart: true },
};

/** The built-in campaign, or null once it has been switched off here. */
export const fallbackPromo = (): Promo | null => (LIVE ? FALLBACK_PROMO : null);
