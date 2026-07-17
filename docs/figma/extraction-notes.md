# Figma extraction notes — Look

Source: figma.com/design/2UujILS7NRzN6BInT1cxpX ("Look (Copy)", page "Light Theme").
Extracted 2026-07-17 via Figma MCP (`get_variable_defs` + `get_design_context` on Home `2007:3267` and PDP `1:1561`). Remaining month budget after extraction: ~1 read call — do not spend casually.

## Tokens (exact values, mapped in src/index.css @theme)

- Page bg `#fdfdfe` · section bg `#f8f8f8` · product-card bg `#faf8ff`
- Accent `#4402d3` (prices, badges, eyebrows, active tab) · hero-script purple `#5000ff`
- Lavender `#e2d5ff` (wishlist circles, carousel arrows, chat bubbles)
- Text: black headings, `#434343` soft heading, `#4e4e4e` body, `#6d6d6d` muted/inactive, `#757575` dark-nav inactive, `#161c2d` footer, `#6b7280` input placeholder
- Sale red `#ff0004` · banner blue `#1754cf` (About page) · lines `#e8e8e8`/`#e4e4e4`
- Shadow xs `0 1 2 rgba(16,24,40,.05)` · nav shadow `0 -7 11.2 rgba(0,0,0,.25)`
- Radii: buttons 8 · cards 11 · images 6 · FAQ rows 14 · search pill 100

## Fonts

- Hero script: Figma uses **Florelie DEMO** (demo-licensed) → substituted **Great Vibes** (user brief: readable + luxury)
- Headings: **Playfair Display** Medium 35px/47 (24px on PDP title)
- Body/UI: **Poppins** — ExtraLight 31px hero sub, Light 14–18, Regular 12–16, Medium 16–18, SemiBold nav-active
- Small UI/badges: **Inter** Medium 12–14

## Type patterns

- Eyebrow: 12px Poppins Regular, uppercase, `#4402d3`, huge line-height (47)
- Section heading: 35px Playfair Medium, black (or `#434343`)
- Body: 16px/22 · card meta 14px/22 · product name 18px Poppins Medium · price 18px Medium `#4402d3`
- PDP price: 35px Medium + 20px strike `#4e4e4e` + 14px Light "Inclusive of all taxes"

## Layout facts

- Canvas 1512px; content width 1338 (gutters ~85–87)
- Navbar (2 variants, sticky, py-22 px-85): **dark** on Home (bg black, white logo, active `#f8f8f8`, inactive `#757575`), **light** on inner pages (bg white, black logo, active black SemiBold, inactive `#6d6d6d`). Search pill 311×40 rounded-100, icons user/heart/cart 24px gap-24
- Hero: 750px tall, full-bleed bg image, headline 65px script, sub 31px ExtraLight lowercase, buttons Shop Now (black 157px) + Explore Collection (outline 169px)
- Benefits bar: 113px, bg `#f8f8f8`, 4 items (icon ~50px + 18px Medium title + 14px desc)
- Product card (grid): 321×492 bg `#faf8ff` r-11; image 294×348 r-6; New badge `#4402d3` 68×18 r-8 Inter 12; heart circle 34px `#e2d5ff` at right of name row; divider line above price row; name 18px, meta 14px, price right-aligned `#4402d3`
- Product card (large, PDP "You may also like"): 420×630, same anatomy + bottom image gradient `rgba(0,0,0,0)→0.64`
- Collection cards: 372×421 r-6, white caption text overlaid bottom ("New Arrivals" 18px + "Modern Elegance" 14px), section on 752px full-bleed bg image
- Promo cards: 518×250 bg `#f8f8f8`, circular product photo 159px right, "Up to **15%** off" (24px red), title 26px Medium `#434343`, black Shop Now
- FAQ: rows 746px wide bg `#f8f8f8` r-14 (open row ~100px, closed 55px), q 18px Medium `#4e4e4e`, a 16px `#6d6d6d`, +/- icons left at 124px; 3 bordered kurta photos right (201×227, border-4 `#e4e4e4` r-6)
- Signup: 998×326 r-32 bg `rgba(61,78,92,0.03)`, input 448×48 r-8 white + black Submit 138px
- Footer: hairline, brand col (logo 105px + blurb 14px `#161c2d` op-70 + social icons), Company + Legal cols (15px header `#4e4e4e`, links 16-17px `#161c2d` lh-40), col gap 370
- PDP: breadcrumb strip 1338×47 `#f8f8f8`; gallery 4 thumbs 108×134 + main 532×623 r-6 w/ heart circle 39px; buy box: title 24px Playfair, 5 stars 24px + "(14) Reviews", swatches 37px, size chips 47px border `#6d6d6d`, qty stepper 112px, stock warn 18px red Light, ADD TO WISHLIST outline + ADD TO CART black (254px each); tabs row w/ hairline; tab body 194px w/ side hairlines
- Chat launcher: black 56px r-12 bottom-right + panel 380×592

## Content quirks (fix in implementation, flag in report)

- Footer blurb is template lorem ("With lots of unique blocks…") → replace with real LOOK copy
- "Timeless peices desgined for everday style." → typos in Figma ("pieces", "designed", "everyday")
- Home hero sub is CAPS text lowered via CSS `lowercase`
- Figma "Home/Popoup" = quick-view modal (typo in layer name)

## User overrides (post-Figma)

- Home section order (user, 2026-07-17): Hero (visual movement) → New Arrivals → Insta Reels (NEW) → Price Drop → Why LOOK? → Best Sellers → Reviews (NEW on Home) → FAQs → Signup/Footer
- Fonts: keep readable-luxury pairing (Playfair + Poppins + Great Vibes)

## Asset map

`src/assets/` — optimized exports (photos ≤1600px jpg q80, icons svg/png as exported). Raw originals in scratchpad `assets_raw/` (session-scoped). `design-refs/` — per-screen crops named `<nodeId>_<name>.png` + `_full-canvas.png`.
Bloom brand ready: id `88fcb0d5-11be-4458-82ab-fa1861d1b654` (Look, instagram.com/look_.in) — gap imagery only; its pastel palette must NOT leak into UI tokens (Figma wins).
