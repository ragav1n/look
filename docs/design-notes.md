# LOOK — build notes, design improvements & migration flags

This documents where the implementation intentionally differs from the Figma
file, the design improvements applied, and everything still on fixtures that
must be wired to live Shopify before launch.

## 1. Deliberate deviations from Figma (with reasons)

- **Home section order** follows the brief, not the Figma canvas order:
  Hero → New Arrivals → Reels from Insta → Price Drop → Why LOOK → Best Sellers
  → Reviews → FAQ → Signup.
- **New sections** added in the design's visual language (not in Figma):
  `InstaReels` (links to @look_.in), `HomeReviews`, and `FeaturedEdit`
  ("Shop the Edit", after New Arrivals).
- **Two 21st.dev components integrated**, adapted to LOOK tokens + real data:
  `stagger-testimonials` (the Reviews section, fed by real reviews; now
  auto-advances with pause-on-hover and uses Playfair quotes) and
  `executive-impact-carousel` ("Shop the Edit", fed by best-sellers). The
  carousel's original GSAP scroll-pin/parallax was **replaced with a real
  horizontal carousel** (scroll-snap track, prev/next arrows that loop, pointer
  drag-to-scroll with a click-guard, gentle auto-advance, edge fades, product →
  styled-shot hover crossfade). GSAP is no longer a dependency.
- **Scroll-reveal motion system** (`src/components/ui/Reveal.tsx` + `[data-reveal]`
  transitions in `index.css`): every Home block fades/slides into place on scroll
  with staggered delays for a "butter-smooth" feel. Uses IntersectionObserver,
  honours `prefers-reduced-motion`, and shows content immediately if it's already
  scrolled past (reload with restored scroll never leaves anything hidden).
- **`StyleBanner`** ("Style That Speaks Before You Do") is built but **not mounted**
  on Home — it isn't in the requested lineup. Available if wanted.
- **Why LOOK / About / Privacy / FAQ** use the brand's real supplied copy, which
  supersedes the Figma placeholder text.
- **Checkout is not a custom page.** Per the headless-Shopify architecture, the
  cart hands off to Shopify's hosted `checkoutUrl`; the Figma custom
  checkout/confirmation screens are intentionally dropped.
- **Fonts** are readable-with-luxury substitutes: Playfair Display (display),
  Poppins (body), Great Vibes (script accent), Inter (small UI).

## 2. Design improvements applied

- **Missing states added** (design was happy-path only): empty cart, empty
  wishlist, no-orders, product-not-found, 404, loading skeletons across product
  grids and PDP, cart "calculated at checkout" note, chat launcher.
- **Accessibility**: semantic landmarks, `aria` on tabs/accordion/modal/dialog,
  labelled icon buttons, keyboard-operable controls, focus-visible states,
  `prefers-reduced-motion` guard on all animations, alt text on imagery.
- **Tap targets**: size chips, swatches, steppers, and nav controls sized for
  comfortable touch.
- **Responsive** (design was desktop-only): mobile hamburger menu, grids
  4→2→1, single-column checkout/cart, fluid containers. Verified at 390px and
  1512px.
- **Contrast**: muted text tokens kept readable; accent `#4402d3` on white passes
  AA.

## 3. Live-data wiring still required (currently fixture-backed)

Everything below renders from **dev fixtures** and swaps to live automatically
where noted. See `docs/shopify.md` for the catalog/cart contract.

| Area | Backed by | To go live |
|---|---|---|
| Catalog (Home, Shop, PDP) | `src/lib/fixtures/catalog.ts` | Set `VITE_SHOPIFY_*` env → live Storefront API, no code change |
| Cart & checkout | `src/lib/fixtures/cart.ts` | Same env → live Cart API + hosted checkout URL |
| Auth (login/signup) | `src/context/UserProvider.tsx` (localStorage) | Shopify **Customer Account API** (OAuth) |
| Orders + tracking | `src/lib/fixtures/account.ts` | Customer Account API orders |
| Addresses | `src/lib/fixtures/account.ts` | Customer Account API addresses |
| Wallet / rewards | `src/lib/fixtures/account.ts` | Loyalty app (not native Shopify) |
| Product reviews | `src/data/reviews.ts` | Reviews app (Judge.me, etc.) or metafields — Storefront returns rating 0 |
| Newsletter signup | stub (no backend) | Klaviyo / Shopify customer capture |
| Chat assistant | scripted (`src/data/chatScript.ts`) | Live agent / AI backend |

## 4. Transform assumptions to confirm against the real store

From `src/lib/shopify/transform.ts` (derived from standard product fields):

- Colour hex resolved from the option label via a name→hex map (use a colour
  metafield for exact brand hexes).
- Category/group from `productType`; the Shop/Best-Sellers category chips assume
  those values.
- Badges: `Sale` when a compare-at price exists, else `New` from a `new` tag.
- Best-sellers uses the `best-seller` tag/collection; new-arrivals uses
  `CREATED_AT`. Point these at curated collections if you maintain them in admin.

## 5. Outstanding content / accounts

- **Terms & Conditions** and **Return Policy** pages need copy (footer links
  currently point to `/support`).
- **Social accounts**: only Instagram (@look_.in) is wired — the fabricated
  Twitter/Facebook/LinkedIn links were removed. Add real URLs if those exist.
- **Privacy "Last updated"** is set to 18 July 2026 — adjust as needed.
