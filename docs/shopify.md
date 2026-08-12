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
  checkout" note. The discount row prints Shopify's own `discountedAmount` —
  the app states no discount **percentage** anywhere.
- **Sort order respects Shopify.** Product lists use Shopify sort keys
  (`BEST_SELLING`, `CREATED_AT`) and collections use `COLLECTION_DEFAULT`
  (the admin-configured order) — never re-sorted on our end.
- **Checkout hands off to Shopify.** The cart's `checkoutUrl` (Cart API) is the
  buy button's destination. We do not build a payment flow.

## Promotions and discount codes

**Creating a discount in Shopify does not put it on the website.** Shopify never
advertises a code — its checkout has a discount box, but it sits empty until the
shopper types something. Making a code visible is a second, separate step here.

Two objects, and they are not the same thing:

| Object | Where | What it does |
| --- | --- | --- |
| **Discount** | Discounts | Makes the code *worth* something. Shopify owns this entirely. |
| **Promo metaobject** | Content → Metaobjects → Promo | Makes the code *visible* on the site, and decides where. |

### Setting up the Promo metaobject (once)

Settings → Custom data → Metaobjects → **Add definition**, name it `Promo`
(type `promo`), and **switch on Storefront access** — without it the site can't
read the entries and quietly falls back to the built-in campaign.

| Field name | Key | Type |
| --- | --- | --- |
| Active | `active` | True/false |
| Discount code | `code` | Single line text |
| Show in top bar | `show_bar` | True/false |
| Show in home ticker | `show_ticker` | True/false |
| Show in popup poster | `show_poster` | True/false |
| Show in cart | `show_cart` | True/false |
| Top bar text | `bar_text` | Single line text |
| Ticker text | `ticker_text` | Single line text |
| Poster headline | `headline` | Single line text |
| Poster script word | `script` | Single line text |
| Poster lines | `lines` | Multi-line text |
| Link | `cta_path` | Single line text |
| Starts | `starts_at` | Date and time |
| Ends | `ends_at` | Date and time |

### Running an offer

1. Create the discount in **Discounts** as usual, and note the code.
2. Add a **Promo** entry. Fill in `code`, tick `active`, and tick **only the
   surfaces you want it on**.
3. Save. The site picks it up on the next page load. No deploy.

A promo is live when `active` is ticked, `code` is filled in, and today is inside
`starts_at`/`ends_at` (leave either blank for "no limit"). If more than one entry
is live, the one with the **latest `starts_at`** wins — that's how you stage the
next campaign beside the current one and switch over with a single tick.

**The surface toggles are the whole point.** A routine 10%-off code can live in
Shopify indefinitely and appear nowhere; a launch campaign can take the poster
and the ticker; a quiet free-shipping offer can take the top bar alone. Unticked
means off, always. The ticker is an announcement, not a list of every code that
exists.

### Turning it off

Untick `active`. Every surface goes quiet. **Do not delete the entry** unless you
want to lose the copy — and note that deleting the *last* entry puts the site
back on the built-in campaign in `src/config/launchOffer.ts` (see below).

### The fallback, and the one trap in it

An empty result from Shopify is ambiguous: a metaobject type that doesn't exist
yet, and a definition whose Storefront access was never switched on, both come
back as `nodes: []` — identical to a store that has retired its campaign. So:

| Situation | What the site shows |
| --- | --- |
| No `promo` entries at all | The built-in campaign in `src/config/launchOffer.ts` |
| Storefront access off, or the lookup failed | Same — the built-in campaign |
| Entries exist, one is live | That entry, everywhere it's ticked for |
| Entries exist, all unticked | **Nothing.** Your off switch beats the fallback |

Once the metaobject exists, `src/config/launchOffer.ts` is dead weight and can be
deleted along with the fallback branch in `getPromo` and its fixture twin.

### How a code reaches checkout

Tapping any promo chip applies the code to the Shopify cart (`applyDiscount` →
`cartDiscountCodesUpdate`), and the cart's `checkoutUrl` is that same cart's
checkout — so hosted checkout opens with the code already applied and itemised.
Nothing is appended to the URL; don't add `?discount=`.

Tapping a chip with an empty bag parks the code in `look.promoCode` instead,
because Shopify marks even a valid code inapplicable on an empty cart. The next
add-to-cart hands it to `cartCreate` in the same request.

**Shopify does not report a bad code as an error.** Applying one it won't honour
returns a *successful* mutation with an empty `userErrors` and `applicable: false`
— identical for an unknown code, an expired one, a customer-specific one, and an
eligible one whose minimum the bag doesn't meet. There is no way to tell them
apart, which is why the cart's message doesn't try to.

### One code at a time

`cartDiscountCodesUpdate` **sets** the list rather than appending, because
Shopify allows one code per order unless the discounts are configured to combine
— and appending to a cart that already has one silently flips the earlier code to
`applicable: false` rather than refusing. If you ever want two codes to stack,
tick "combines with other discounts" on both in Shopify *and* change
`applyDiscount` to append.

### Marketing emails are separate

The newsletter welcome code lives in the **`email_template`** metaobject's
`discount_code` field (see `api/_lib/email/content.ts`), not here. That side has
always been Shopify-editable and is unaffected by any of the above.

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
