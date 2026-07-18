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
  selectedOptions: SFSelectedOption[];
}

export interface SFProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
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
  variants: { nodes: SFVariant[] };
  /** `custom.hero_tagline` — null on products that don't set it. */
  heroTagline: { value: string } | null;
}

export interface SFCartLine {
  id: string;
  quantity: number;
  cost: {
    totalAmount: SFMoney;
    amountPerQuantity: SFMoney;
  };
  merchandise: {
    id: string;
    title: string;
    image: SFImage | null;
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
  lines: { nodes: SFCartLine[] };
}
