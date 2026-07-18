/** Product category label. Kept as a string because it maps to Shopify's
 *  productType (or a collection), which is admin-configurable. */
export type Category = string;

/** Shop sort options — map to Shopify sort keys in live mode. */
export type ProductSort = "featured" | "price-asc" | "price-desc" | "newest";

export interface Money {
  amount: number;
  currencyCode: string;
}

export interface ProductVariant {
  /** Shopify variant GID — the cart's `merchandiseId`. Fixtures use a `fixture:` prefix. */
  id: string;
  title: string;
  size: string;
  color: string;
  availableForSale: boolean;
  price: Money;
}

export interface Product {
  /** Shopify product GID (fixtures use a `fixture:` prefix) */
  id: string;
  /** Shopify product handle — used as the URL slug */
  slug: string;
  name: string;
  sku: string;
  category: Category;
  /** Secondary label shown on cards, e.g. "Tops" */
  group: string;
  /** Display price in major units (Shopify minVariantPrice). Display-only. */
  price: number;
  /** Compare-at / MRP in major units (Shopify compareAtPrice). Display-only. */
  mrp?: number;
  currencyCode: string;
  badge?: "New" | "Sale";
  images: string[];
  colors: { name: string; hex: string }[];
  sizes: string[];
  variants: ProductVariant[];
  rating: number;
  reviewCount: number;
  stockLeft?: number;
  description: string;
  details: { title: string; body: string[] };
  bestSeller?: boolean;
  newArrival?: boolean;
  /** Short editorial line shown under the product name on hero slides.
   *  Shopify: the `custom.hero_tagline` product metafield. */
  heroTagline?: string;
}

export interface Review {
  id: string;
  productId: string;
  /** Product display name, denormalised so review cards need no product fetch */
  productName?: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  verified?: boolean;
}

/* ------------------------------------------------------------------ *
 * Cart — shaped after Shopify's Cart API so live + fixture share it.  *
 * Totals come straight from Shopify; tax/shipping stay null until     *
 * checkout (Shopify computes them from the address). We never invent  *
 * discount, tax or shipping figures on our side.                      *
 * ------------------------------------------------------------------ */

export interface CartLine {
  /** Shopify cart line id (fixtures use a synthetic id) */
  id: string;
  variantId: string;
  productSlug: string;
  name: string;
  image: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

export interface CartCost {
  subtotal: Money;
  total: Money;
  /** null until Shopify returns them at checkout */
  totalTax: Money | null;
  totalShipping: Money | null;
}

export interface Cart {
  /** Shopify cart id, or null for an empty/unstarted cart */
  id: string | null;
  /** Shopify-hosted checkout URL — where we hand off to buy */
  checkoutUrl: string | null;
  totalQuantity: number;
  lines: CartLine[];
  cost: CartCost;
}

/** Payload the UI sends to add a variant. Only `variantId`/`quantity` reach
 *  Shopify; the snapshot fields drive optimistic display + the fixture cart. */
export interface AddToCartInput {
  variantId: string;
  quantity: number;
  productSlug: string;
  name: string;
  image: string;
  size: string;
  color: string;
  unitPrice: Money;
}

export type OrderStatus =
  | "ordered"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export interface Order {
  id: string;
  placedAt: string;
  status: OrderStatus;
  items: {
    productSlug: string;
    variantId: string;
    name: string;
    image: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
  }[];
  address: Address;
  shippingMethod: string;
  paymentMethod: string;
  totals: { subtotal: number; shipping: number; taxes: number; total: number };
  timeline: { status: OrderStatus; at: string | null }[];
  shipmentUpdates: { at: string; text: string }[];
  courier?: { name: string; trackingId: string; phone: string };
}

export interface Address {
  id: string;
  label: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault?: boolean;
}

export interface WalletTransaction {
  id: string;
  date: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  status: "completed" | "pending";
}

export interface Faq {
  id: string;
  category: string;
  q: string;
  a: string;
}
