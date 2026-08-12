/** Subset of Shopify Storefront API response shapes we read. */

export interface SFMoney {
  amount: string;
  currencyCode: string;
}

export interface SFImage {
  url: string;
  altText: string | null;
}

export interface SFSelectedOption {
  name: string;
  value: string;
}

export interface SFVariant {
  id: string;
  title: string;
  sku: string | null;
  availableForSale: boolean;
  quantityAvailable: number | null;
  price: SFMoney;
  compareAtPrice: SFMoney | null;
  selectedOptions: SFSelectedOption[];
}

export interface SFProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  productType: string;
  tags: string[];
  createdAt: string;
  publishedAt: string | null;
  availableForSale: boolean;
  vendor: string;
  totalInventory: number | null;
  priceRange: { minVariantPrice: SFMoney };
  compareAtPriceRange: { minVariantPrice: SFMoney };
  featuredImage: SFImage | null;
  images: { nodes: SFImage[] };
  options: { name: string; values: string[] }[];
  collections: { nodes: { handle: string }[] };
  variants: { nodes: SFVariant[] };
  /** `custom.hero_tagline` — null on products that don't set it. */
  heroTagline: { value: string } | null;
}

export interface SFCollection {
  id: string;
  handle: string;
  title: string;
  image: SFImage | null;
  products: { nodes: { featuredImage: SFImage | null }[] };
}

/** A `reel` metaobject node. Each field is queried with an alias, so it comes
 *  back as a `MetaobjectField` (`{ value }`, plus `reference` for the file). */
export interface SFReel {
  id: string;
  image: { reference: { image: SFImage } | null } | null;
  caption: { value: string | null } | null;
  link: { value: string | null } | null;
  position: { value: string | null } | null;
}

/** A `promo` metaobject node. Same aliased-field shape as SFReel — and note
 *  that Shopify hands back every value as a string, booleans ("true"/"false")
 *  and dates (ISO 8601) included. */
export interface SFPromoField {
  value: string | null;
}

export interface SFPromo {
  id: string;
  active: SFPromoField | null;
  code: SFPromoField | null;
  showBar: SFPromoField | null;
  showTicker: SFPromoField | null;
  showPoster: SFPromoField | null;
  showCart: SFPromoField | null;
  barText: SFPromoField | null;
  tickerText: SFPromoField | null;
  headline: SFPromoField | null;
  script: SFPromoField | null;
  lines: SFPromoField | null;
  ctaPath: SFPromoField | null;
  startsAt: SFPromoField | null;
  endsAt: SFPromoField | null;
}

/** One discount Shopify has applied, and what it took off. Deliberately just
 *  the amount — see the note in CART_FRAGMENT. */
export interface SFDiscountAllocation {
  discountedAmount: SFMoney;
}

export interface SFCartDiscountCode {
  code: string;
  /** False when Shopify accepted the code onto the cart but won't honour it —
   *  unknown, expired, customer-specific, or a minimum this cart doesn't meet.
   *  Shopify does not say which. */
  applicable: boolean;
}

export interface SFCartLine {
  id: string;
  quantity: number;
  cost: {
    totalAmount: SFMoney;
    amountPerQuantity: SFMoney;
  };
  discountAllocations: SFDiscountAllocation[];
  merchandise: {
    id: string;
    title: string;
    image: SFImage | null;
    quantityAvailable: number | null;
    selectedOptions: SFSelectedOption[];
    product: { handle: string; title: string; featuredImage: SFImage | null };
  };
}

export interface SFCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: SFMoney;
    totalAmount: SFMoney;
    totalTaxAmount: SFMoney | null;
    totalDutyAmount: SFMoney | null;
  };
  discountCodes: SFCartDiscountCode[];
  discountAllocations: SFDiscountAllocation[];
  lines: { nodes: SFCartLine[] };
}
