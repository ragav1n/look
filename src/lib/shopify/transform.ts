import type { Cart, CartLine, Collection, Money, Product, ProductVariant } from "@/types";
import type { SFCart, SFCollection, SFMoney, SFProduct, SFVariant } from "./types";

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
    price: money(v.price),
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
  const lowStock =
    p.totalInventory != null && p.totalInventory > 0 && p.totalInventory <= 5
      ? p.totalInventory
      : undefined;

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
    stockLeft: lowStock,
    description: p.description,
    details: { title: "Product Details", body: p.description ? [p.description] : [] },
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

const emptyMoney = (currencyCode: string): Money => ({ amount: 0, currencyCode });

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
    unitPrice: money(l.cost.amountPerQuantity),
    lineTotal: money(l.cost.totalAmount),
  }));

  return {
    id: c.id,
    checkoutUrl: c.checkoutUrl,
    totalQuantity: c.totalQuantity,
    lines,
    cost: {
      subtotal: money(c.cost.subtotalAmount),
      total: money(c.cost.totalAmount),
      totalTax: c.cost.totalTaxAmount ? money(c.cost.totalTaxAmount) : null,
      totalShipping: null,
    },
  };
}

export const emptyCart = (currencyCode = "INR"): Cart => ({
  id: null,
  checkoutUrl: null,
  totalQuantity: 0,
  lines: [],
  cost: {
    subtotal: emptyMoney(currencyCode),
    total: emptyMoney(currencyCode),
    totalTax: null,
    totalShipping: null,
  },
});
