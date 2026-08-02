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

## Domains and the Online Store theme

```
look.ind.in        A      216.198.79.1          -> Vercel (this storefront)
www.look.ind.in    CNAME  cname.vercel-dns.com  -> Vercel, 308 to apex
shop.look.ind.in   CNAME  shops.myshopify.com   -> Shopify, PRIMARY domain
```

`cart.checkoutUrl` follows Shopify's **primary** domain, so making
`shop.look.ind.in` primary is what puts checkout on the brand
(`https://shop.look.ind.in/checkouts/cn/...`). No app code depends on this:
`VITE_SHOPIFY_STORE_DOMAIN` stays `look-10300.myshopify.com` because Shopify's
`/api/*` endpoints are exempt from the primary-domain redirect, which also keeps
the `connect-src` pin in `vercel.json` valid.

**Never point the apex A record at Shopify.** Shopify's "connect your domain"
onboarding tells you to delete the Vercel record and add `23.227.38.65` — that
flow assumes Shopify serves your pages and does not understand headless. Doing it
takes look.ind.in down. If a Shopify DNS setup card asks about the `@` record,
stop; for a subdomain it should only ever ask for the CNAME.

A side effect of a custom primary domain is that the near-empty Online Store theme
becomes publicly reachable at `shop.look.ind.in`, and Shopify's own order and
abandoned-cart emails link customers into it.
`docs/shopify-theme-redirect.liquid` bounces those theme-rendered pages back to
this storefront, preserving product/cart/policy paths. Install it as a **snippet**
named `headless-redirect`, then add one line to `layout/theme.liquid` directly
below `{{ content_for_header }}`:

```liquid
{% render 'headless-redirect' %}
```

Keep the edit to `theme.liquid` to that single line. Shopify refuses to save the
layout if `{{ content_for_header }}` goes missing from the head section
(`FileSaveError: Missing {{content_for_header}}`), which is easy to trigger by
pasting over a selection. The redirect cannot affect checkout, which is not
theme-rendered on the Basic plan.

## Policies live in two places

Shopify needs its own copy of the Refund, Shipping and Terms policies — the
theme serves them at `/policies/*`, checkout links to them, and until they exist
those URLs 404. The wording must stay identical to the site's, so don't retype
them:

```sh
node scripts/extract-policies.mjs shipping | pbcopy   # returns | shipping | terms
```

Paste into Settings → Policies via the editor's `<>` source button. To confirm a
paste landed intact, strip tags from both and diff — the site copy and the
rendered Shopify page should share every paragraph in both directions.

When the copy changes, it has to change in both places. `src/pages/Terms.tsx`
carries a header comment recording each deliberate deviation from the
brand-supplied document; keep adding to it rather than editing copy silently.

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
