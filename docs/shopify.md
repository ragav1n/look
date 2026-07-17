# Shopify (headless) integration

This storefront is **frontend-only**. Shopify is the backend via the **Storefront
API (GraphQL)**. Product data, images, descriptions, pricing, variants,
inventory, discounts, checkout, and orders all live in Shopify — none of that is
hardcoded in this repo.

## How data flows

```
components ──> src/lib/catalog.ts ──┬─(env set)──> src/lib/shopify/catalog.ts ──> Storefront API
                                    └─(no env)──> src/lib/fixtures/catalog.ts  (dev only)

CartContext ──> src/lib/cart.ts ────┬─(env set)──> src/lib/shopify/cart.ts ────> Storefront Cart API
                                    └─(no env)──> src/lib/fixtures/cart.ts     (dev only)
```

- **Components never import fixtures or the Shopify modules directly** — only the
  public `src/lib/catalog.ts` and `src/context/CartContext`.
- `isShopifyConfigured` (in `src/lib/shopify/client.ts`) is true when both
  `VITE_SHOPIFY_STORE_DOMAIN` and `VITE_SHOPIFY_STOREFRONT_TOKEN` are set. When
  true, everything runs against the live store; when false, the dev fixtures back
  the same interface so the UI renders without a store.

## Going live

1. In Shopify admin, add the **Headless** sales channel and create a Storefront
   API access token.
2. `cp .env.example .env.local` and fill in `VITE_SHOPIFY_STORE_DOMAIN` +
   `VITE_SHOPIFY_STOREFRONT_TOKEN`.
3. Restart `npm run dev`. The app now fetches live catalog + cart.

## Conventions this enforces

- **Pricing is displayed as-is.** We never compute tax, shipping, or discounts.
  Cart totals come from Shopify; tax/shipping stay `null` until checkout (Shopify
  needs the address to compute them). The cart shows subtotal + a "calculated at
  checkout" note.
- **Sort order respects Shopify.** Product lists use Shopify sort keys
  (`BEST_SELLING`, `CREATED_AT`) and collections use `COLLECTION_DEFAULT`
  (the admin-configured order) — never re-sorted on our end.
- **Checkout hands off to Shopify.** The cart's `checkoutUrl` (Cart API) is the
  buy button's destination. We do not build a payment flow.

## Assumptions to revisit when the real store is connected

These are derived from standard product fields today; adjust the transform
(`src/lib/shopify/transform.ts`) once the store's setup is known:

- **Colour hex** is resolved from the colour option label via a name→hex map.
  For exact brand hexes, expose a colour metafield and read it.
- **Category / group** come from `productType`. The Best Sellers filter chips
  (`All / Kurta Set / Coord Set`) assume those productType values.
- **Ratings/reviews** are `0` from the Storefront API — wire a reviews app
  (Judge.me, etc.) or metafields. Home review copy is local editorial content.
- **Badges**: `Sale` when a compare-at price exists, else `New` when tagged
  `new`/`new-arrival`. Best-seller list uses the `best-seller` tag / collection.
- **Home sections** currently query product-level sort keys. Point
  `getNewArrivals` / `getBestSellers` at real collection handles if you curate
  those collections in admin.
