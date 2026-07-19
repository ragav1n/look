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
  /** Handles of the Shopify collections this product belongs to. Drives the
   *  Shop category filters, so categorisation lives in Shopify. */
  collectionHandles?: string[];
}

/** A Shopify collection, surfaced as a browsable category tile. */
export interface Collection {
  /** Shopify collection GID */
  id: string;
  /** Shopify collection handle — the raw admin value, e.g. "bottom" */
  handle: string;
  title: string;
  /** Collection image if the admin set one, else the first product's featured
   *  image. Empty when the collection has neither. */
  image: string;
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
  /** A recoverable problem Shopify reported alongside an otherwise-successful
   *  mutation — e.g. a line clamped to available stock. The cart is valid; this
   *  just explains why it may not match what was asked for. */
  notice?: string;
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

export interface OrderItem {
  /** Shopify product GID. Null when Shopify no longer resolves the line. */
  productId: string | null;
  /** Shopify variant GID. */
  variantId: string | null;
  /** Resolved from `productId` via the Storefront API — the Customer Account
   *  API exposes no handle. Absent when the product was deleted or
   *  unpublished, in which case the item renders unlinked. */
  productSlug?: string;
  name: string;
  image: string;
  size: string;
  color: string;
  quantity: number;
  price: Money;
}

/** Carrier details for a shipped order. Shopify gives no courier phone number,
 *  so we link to the carrier's own tracking page instead. */
export interface OrderTracking {
  company: string | null;
  number: string | null;
  url: string | null;
}

/**
 * One step of the derived order timeline. `reached` and `at` are separate on
 * purpose: Shopify's `latestShipmentStatus` tells us a shipment is out for
 * delivery without saying *when* it became so. Such a step is marked reached
 * but carries no timestamp, rather than borrowing an unrelated one.
 */
export interface OrderStep {
  status: OrderStatus;
  reached: boolean;
  at: string | null;
}

/**
 * An order as the Customer Account API can actually describe it. Shopify has no
 * native status timeline — `timeline` is derived from processedAt, fulfilment
 * timestamps and latestShipmentStatus. Note there is no payment-method field
 * anywhere on the API, so we report the payment *status* and never invent a
 * method.
 */
export interface Order {
  /** Shopify order GID — what a refetch needs. */
  id: string;
  /** Display label, e.g. "#1001" (Shopify's `name`). */
  number: string;
  /** Numeric portion of the GID — the `/account/orders/:orderId` segment. */
  reference: string;
  placedAt: string;
  status: OrderStatus;
  items: OrderItem[];
  /** Null for orders that never carried a shipping address. */
  address: Address | null;
  totals: { subtotal: Money | null; shipping: Money; taxes: Money | null; total: Money };
  timeline: OrderStep[];
  tracking?: OrderTracking;
  /** Shopify-hosted order status page — the authoritative tracking view. */
  statusPageUrl: string;
  /** Shopify's `paymentInformation.paymentStatus`, humanised. The API exposes
   *  no payment *method*, so we never claim one. */
  paymentStatus?: string;
}

/** Signed-in customer's editable profile. Mirrors the subset of Shopify's
 *  Customer Account API `customer` we surface (name/email/phone). */
export interface UserProfile {
  name: string;
  email: string;
  phone: string;
}

/**
 * A saved delivery address. Shaped to round-trip through Shopify's
 * `CustomerAddress`: reads give both a display `province` and a `zoneCode`,
 * but writes accept only the code, so both are carried. There is no Shopify
 * equivalent of a "Home"/"Work" label, so we don't offer one.
 */
export interface Address {
  /** Shopify CustomerAddress GID. */
  id: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  /** Display name of the state, from Shopify's `province`. */
  state: string;
  /** ISO subdivision code, e.g. "KA" — required on every write. */
  zoneCode: string;
  /** Shopify's `zip`. */
  pincode: string;
  phone: string;
  isDefault?: boolean;
}

/** The address form's draft. `isDefault` is set through its own mutation, and
 *  the id is server-assigned, so neither is part of the input. */
export type AddressInput = Omit<Address, "id" | "isDefault">;

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
