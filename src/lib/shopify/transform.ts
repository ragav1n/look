import type { Cart, CartLine, Collection, Money, Product, ProductVariant, Promo, Reel } from "@/types";
import { safeAppPath, safeHttpUrl } from "@/lib/url";
import { FALLBACK_PROMO } from "@/config/launchOffer";
import type {
  SFCart,
  SFCollection,
  SFDiscountAllocation,
  SFMoney,
  SFProduct,
  SFPromo,
  SFPromoField,
  SFReel,
  SFVariant,
} from "./types";

const money = (m: SFMoney): Money => ({
  amount: Number.parseFloat(m.amount),
  currencyCode: m.currencyCode,
});

/** Common colour-name → hex fallback for swatches. Shopify product options
 *  carry no colour value, so we resolve a hex from the option label. Stores
 *  that need exact brand hexes should expose a colour metafield later. */
const COLOR_HEX: Record<string, string> = {
  red: "#B3261E",
  crimson: "#B3261E",
  scarlet: "#C21807",
  violet: "#6f4a6b",
  purple: "#6f4a6b",
  green: "#3E6B4F",
  emerald: "#2F6B4F",
  sage: "#9AA88C",
  pink: "#E8A0B0",
  blush: "#E8B4BE",
  rose: "#D96B8A",
  mustard: "#D9A404",
  yellow: "#D9A404",
  cream: "#EFE7D8",
  ivory: "#F2ECDD",
  black: "#111111",
  white: "#FFFFFF",
  blue: "#1754CF",
  navy: "#1B2A4A",
  grey: "#8A8A8A",
  gray: "#8A8A8A",
};

const colorHex = (name: string): string => {
  const key = name.trim().toLowerCase();
  if (COLOR_HEX[key]) return COLOR_HEX[key];
  const word = Object.keys(COLOR_HEX).find((k) => key.includes(k));
  return word ? COLOR_HEX[word] : "#B8B8B8";
};

/** How long a product carries the "New" badge after going live. */
const NEW_WINDOW_DAYS = 30;

const isWithinNewWindow = (iso: string | null): boolean => {
  if (!iso) return false;
  const published = Date.parse(iso);
  return (
    Number.isFinite(published) && Date.now() - published < NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );
};

const optionValue = (v: SFVariant, name: string): string =>
  v.selectedOptions.find((o) => o.name.toLowerCase() === name.toLowerCase())?.value ?? "";

const findOption = (p: SFProduct, name: string) =>
  p.options.find((o) => o.name.toLowerCase() === name.toLowerCase());

export function toProduct(p: SFProduct): Product {
  const price = Number.parseFloat(p.priceRange.minVariantPrice.amount);
  const compareAt = Number.parseFloat(p.compareAtPriceRange.minVariantPrice.amount);
  const currencyCode = p.priceRange.minVariantPrice.currencyCode;
  const onSale = compareAt > price;

  const sizeOption = findOption(p, "Size");
  const colorOption = findOption(p, "Color") ?? findOption(p, "Colour");

  const colors = (colorOption?.values ?? []).map((name) => ({ name, hex: colorHex(name) }));
  const sizes = sizeOption?.values ?? [];

  const variants: ProductVariant[] = p.variants.nodes.map((v) => ({
    id: v.id,
    title: v.title,
    size: optionValue(v, "Size"),
    color: optionValue(v, "Color") || optionValue(v, "Colour"),
    availableForSale: v.availableForSale,
    quantityAvailable: v.quantityAvailable ?? undefined,
    price: money(v.price),
    compareAtPrice: v.compareAtPrice ? money(v.compareAtPrice) : undefined,
  }));

  const images = (
    p.images.nodes.length ? p.images.nodes.map((i) => i.url) : p.featuredImage ? [p.featuredImage.url] : []
  );

  // "New" is derived from when the product went live, so it applies itself to
  // every new upload and expires on its own. A `new` / `new-arrival` tag still
  // forces it on — use that to keep something featured past the window.
  const isNew =
    p.tags.some((t) => t.toLowerCase() === "new" || t.toLowerCase() === "new-arrival") ||
    isWithinNewWindow(p.publishedAt ?? p.createdAt);
  return {
    id: p.id,
    slug: p.handle,
    name: p.title,
    sku: p.variants.nodes[0]?.sku ?? "",
    category: p.productType || "Kurta Set",
    group: p.productType || "Tops",
    price,
    mrp: onSale ? compareAt : undefined,
    currencyCode,
    badge: onSale ? "Sale" : isNew ? "New" : undefined,
    images,
    colors,
    sizes,
    variants,
    // Ratings/reviews come from a reviews app/metafield — 0 until wired.
    rating: 0,
    reviewCount: 0,
    description: p.description,
    // The store admin authors one rich description in Shopify (tables, lists).
    // Render that HTML directly; the old `details` split was a plain-text copy
    // of the same field, which duplicated the whole block on the PDP.
    descriptionHtml: p.descriptionHtml || undefined,
    details: { title: "Product Details", body: [] },
    bestSeller: p.tags.some((t) => t.toLowerCase() === "best-seller"),
    newArrival: isNew,
    heroTagline: p.heroTagline?.value || undefined,
    collectionHandles: p.collections.nodes.map((c) => c.handle),
  };
}

/** Not every collection has an image set in the admin (LOOK's "Dresses" doesn't),
 *  so fall back to its first product's featured shot before giving up. */
export function toCollection(c: SFCollection): Collection {
  return {
    id: c.id,
    handle: c.handle,
    title: c.title,
    image: c.image?.url ?? c.products.nodes[0]?.featuredImage?.url ?? "",
  };
}

/** Map a `reel` metaobject node. Returns null for an entry missing its image or
 *  link — a half-filled card is skipped rather than rendered broken. */
export function toReel(r: SFReel): Reel | null {
  const img = r.image?.reference?.image;
  // Only accept an http(s) link — a `javascript:` metaobject value must not
  // reach the card's href. A rejected link skips the card, same as a missing one.
  const link = safeHttpUrl(r.link?.value);
  if (!img?.url || !link) return null;
  return {
    id: r.id,
    image: img.url,
    imageAlt: img.altText ?? "",
    caption: r.caption?.value?.trim() ?? "",
    link,
  };
}

/* Metaobject values all arrive as strings, so each reader below states what it
   expects and what a blank means. A missing field and a blank one are the same
   thing: the admin left it alone. */
const fieldFlag = (f?: SFPromoField | null): boolean =>
  f?.value?.trim().toLowerCase() === "true";

const fieldText = (f: SFPromoField | null | undefined, fallback: string): string =>
  f?.value?.trim() || fallback;

/** ISO 8601 → epoch ms, or null for blank/unparseable. Null means "unbounded"
 *  at both ends of the window, so a promo with neither date simply runs. */
const fieldTime = (f?: SFPromoField | null): number | null => {
  const t = Date.parse(f?.value?.trim() ?? "");
  return Number.isFinite(t) ? t : null;
};

/** When a `promo` entry started, for ordering. Entries with no start date sort
 *  oldest, so an explicitly-scheduled campaign always beats an open-ended one. */
export const promoStartedAt = (p: SFPromo): number => fieldTime(p.startsAt) ?? 0;

/** Map a `promo` metaobject node, or null when it isn't live right now —
 *  switched off, outside its window, or missing the one field it can't do
 *  without. Every surface renders nothing for a null promo, so that IS the
 *  retirement path; there's no separate "hidden" state to keep in sync.
 *
 *  Blank optional fields fall back to the built-in campaign's wording rather
 *  than blanking a surface out: a half-filled entry should read as unfinished
 *  copy, not as a broken band of empty red. */
export function toPromo(p: SFPromo, now = Date.now()): Promo | null {
  const code = fieldText(p.code, "").toUpperCase();
  if (!code || !fieldFlag(p.active)) return null;

  const startsAt = fieldTime(p.startsAt);
  const endsAt = fieldTime(p.endsAt);
  if (startsAt !== null && now < startsAt) return null;
  if (endsAt !== null && now >= endsAt) return null;

  const lines = fieldText(p.lines, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    code,
    barText: fieldText(p.barText, FALLBACK_PROMO.barText),
    tickerText: fieldText(p.tickerText, FALLBACK_PROMO.tickerText),
    headline: fieldText(p.headline, FALLBACK_PROMO.headline),
    script: fieldText(p.script, FALLBACK_PROMO.script),
    lines: lines.length ? lines : [...FALLBACK_PROMO.lines],
    // A metaobject value must not be able to steer the router off-site.
    ctaPath: safeAppPath(p.ctaPath?.value, FALLBACK_PROMO.ctaPath),
    /* Unticked (or absent, on a definition that predates one of these fields)
       means OFF. A new discount stays invisible until it's placed on purpose. */
    surfaces: {
      bar: fieldFlag(p.showBar),
      ticker: fieldFlag(p.showTicker),
      poster: fieldFlag(p.showPoster),
      cart: fieldFlag(p.showCart),
    },
  };
}

const emptyMoney = (currencyCode: string): Money => ({ amount: 0, currencyCode });

const sumAllocations = (allocations: SFDiscountAllocation[]): number =>
  allocations.reduce((total, a) => total + Number.parseFloat(a.discountedAmount.amount), 0);

export function toCart(c: SFCart): Cart {
  const lines: CartLine[] = c.lines.nodes.map((l) => ({
    id: l.id,
    variantId: l.merchandise.id,
    productSlug: l.merchandise.product.handle,
    name: l.merchandise.product.title,
    image: l.merchandise.image?.url ?? l.merchandise.product.featuredImage?.url ?? "",
    size: l.merchandise.selectedOptions.find((o) => o.name.toLowerCase() === "size")?.value ?? "",
    color:
      l.merchandise.selectedOptions.find((o) => ["color", "colour"].includes(o.name.toLowerCase()))
        ?.value ?? "",
    quantity: l.quantity,
    quantityAvailable: l.merchandise.quantityAvailable ?? undefined,
    unitPrice: money(l.cost.amountPerQuantity),
    lineTotal: money(l.cost.totalAmount),
  }));

  /* Split by where Shopify put it, because the two behave differently against
     subtotalAmount: line-level allocations have already been taken out of it,
     order-level ones have not. */
  const lineSavings = c.lines.nodes.reduce((n, l) => n + sumAllocations(l.discountAllocations), 0);
  const savings = lineSavings + sumAllocations(c.discountAllocations);
  const subtotal = money(c.cost.subtotalAmount);

  return {
    id: c.id,
    checkoutUrl: c.checkoutUrl,
    totalQuantity: c.totalQuantity,
    lines,
    cost: {
      subtotal,
      subtotalBeforeDiscount: { ...subtotal, amount: subtotal.amount + lineSavings },
      total: money(c.cost.totalAmount),
      totalTax: c.cost.totalTaxAmount ? money(c.cost.totalTaxAmount) : null,
      totalShipping: null,
    },
    /* A cart with no codes has no discount state at all, rather than a zero —
       "nothing applied" and "a code worth ₹0" should not render the same. */
    discount: c.discountCodes.length
      ? {
          codes: c.discountCodes.map((d) => ({ code: d.code, applicable: d.applicable })),
          savings: { ...subtotal, amount: savings },
        }
      : null,
  };
}

export const emptyCart = (currencyCode = "INR"): Cart => ({
  id: null,
  checkoutUrl: null,
  totalQuantity: 0,
  lines: [],
  cost: {
    subtotal: emptyMoney(currencyCode),
    subtotalBeforeDiscount: emptyMoney(currencyCode),
    total: emptyMoney(currencyCode),
    totalTax: null,
    totalShipping: null,
  },
  discount: null,
});
