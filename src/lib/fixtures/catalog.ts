/**
 * DEV-ONLY fixture catalog. This is the single isolated module that stands in
 * for live Shopify data during development — no component imports it directly
 * (they go through src/lib/catalog). The moment VITE_SHOPIFY_* env vars are set,
 * src/lib/catalog switches to the live Storefront API and this file is unused.
 *
 * Do NOT scatter this data into components or treat it as the source of truth:
 * products, prices, and images live in Shopify.
 */
import type { Collection, Product, ProductSort, ProductVariant } from "@/types";
import { DEFAULT_CURRENCY } from "../format";
import product17 from "@/assets/product-17.jpg";
import product18 from "@/assets/product-18.jpg";
import product19 from "@/assets/product-19.jpg";
import product20 from "@/assets/product-20.jpg";
import product21 from "@/assets/product-21.jpg";
import product22 from "@/assets/product-22.jpg";
import product23 from "@/assets/product-23.jpg";
import product24 from "@/assets/product-24.jpg";
import product25 from "@/assets/product-25.jpg";
import kurtaFloral1 from "@/assets/kurta-floral-1.jpg";
import kurtaFloral2 from "@/assets/kurta-floral-2.jpg";
import kurtaFloral3 from "@/assets/kurta-floral-3.jpg";
import pdpMain from "@/assets/pdp-main-24.jpg";
import pdpThumb20 from "@/assets/pdp-thumb-20.jpg";
import pdpThumb21 from "@/assets/pdp-thumb-21.jpg";
import pdpThumb22 from "@/assets/pdp-thumb-22.jpg";
import pdpThumb23 from "@/assets/pdp-thumb-23.jpg";
import pdpRel17 from "@/assets/pdp-rel-17.jpg";
import pdpRel18 from "@/assets/pdp-rel-18.jpg";
import pdpRel19 from "@/assets/pdp-rel-19.jpg";
import promoImg from "@/assets/promo-img-1697.png";
import promoM6 from "@/assets/promo-m6.jpg";

const RED = { name: "Red", hex: "#B3261E" };
const VIOLET = { name: "Violet", hex: "#6f4a6b" };
const GREEN = { name: "Green", hex: "#3E6B4F" };
const PINK = { name: "Pink", hex: "#E8A0B0" };
const YELLOW = { name: "Mustard", hex: "#D9A404" };
const CREAM = { name: "Cream", hex: "#EFE7D8" };

const SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];

const defaultDetails = (fabric: string) => ({
  title: "Timeless Elegance",
  body: [
    `This elegant set is designed to bring together comfort and timeless style. Crafted from soft, breathable ${fabric} with delicate patterns, it offers a perfect blend of traditional charm and modern elegance.`,
    "Ideal for festive occasions, casual gatherings, or everyday ethnic wear, this set ensures you look stylish while feeling comfortable throughout the day.",
  ],
});

type RawProduct = Omit<Product, "variants" | "currencyCode">;

/** Fabricate a Shopify-shaped variant per colour×size so the cart has real
 *  merchandise ids to work with in dev. */
const makeVariants = (p: RawProduct): ProductVariant[] =>
  p.colors.flatMap((c) =>
    p.sizes.map((s) => ({
      id: `fixture:variant:${p.slug}:${c.name}:${s}`,
      title: `${c.name} / ${s}`,
      size: s,
      color: c.name,
      availableForSale: true,
      price: { amount: p.price, currencyCode: DEFAULT_CURRENCY },
    })),
  );

const withVariants = (p: RawProduct): Product => ({
  ...p,
  currencyCode: DEFAULT_CURRENCY,
  variants: makeVariants(p),
});

const raw: RawProduct[] = [
  {
    id: "p-red-kurta-set",
    slug: "red-kurta-set",
    name: "Red Kurta Set",
    sku: "K12-123",
    category: "Kurta Set",
    group: "Tops",
    price: 600,
    mrp: 760,
    badge: "New",
    images: [pdpMain, pdpThumb20, pdpThumb21, pdpThumb22, pdpThumb23],
    colors: [RED, VIOLET],
    sizes: SIZES,
    rating: 4.5,
    reviewCount: 14,
    stockLeft: 2,
    description:
      "Discover a curated collection of modern western wear designed for comfort, confidence, and everyday elegance. Explore timeless essentials and trendy styles that elevate your wardrobe.",
    details: defaultDetails("cotton blend"),
    bestSeller: true,
    newArrival: true,
  },
  {
    id: "p-floral-thread-kurta",
    slug: "floral-thread-work-kurta",
    name: "Floral Thread-Work Kurta",
    sku: "K12-124",
    category: "Kurta Set",
    group: "Tops",
    price: 670,
    images: [kurtaFloral1, kurtaFloral2, kurtaFloral3],
    colors: [PINK, CREAM],
    sizes: SIZES,
    rating: 4.6,
    reviewCount: 21,
    description:
      "Floral embroidered regular thread-work kurta with trousers and dupatta — a festive-ready three-piece with intricate detailing.",
    details: defaultDetails("viscose"),
    bestSeller: true,
  },
  {
    id: "p-crimson-coord",
    slug: "crimson-coord-set",
    name: "Crimson Coord Set",
    sku: "K12-127",
    category: "Coord Set",
    group: "Bottom",
    price: 650,
    images: [product18, pdpRel18],
    colors: [RED, PINK],
    sizes: SIZES,
    rating: 4.3,
    reviewCount: 9,
    description:
      "A relaxed two-piece coord in deep crimson — pair together for an effortless set or split across your wardrobe.",
    details: defaultDetails("rayon"),
    bestSeller: true,
    newArrival: true,
  },
  {
    id: "p-emerald-kurta",
    slug: "emerald-kurta-set",
    name: "Emerald Kurta Set",
    sku: "K12-121",
    category: "Kurta Set",
    group: "Tops",
    price: 370,
    mrp: 450,
    badge: "Sale",
    images: [product20, pdpRel19],
    colors: [GREEN],
    sizes: SIZES,
    rating: 4.1,
    reviewCount: 11,
    description:
      "A breezy emerald set with clean lines and a comfortable silhouette — an everyday staple with a rich colour story.",
    details: defaultDetails("cotton"),
    bestSeller: true,
  },
  {
    id: "p-mustard-anarkali",
    slug: "mustard-anarkali",
    name: "Mustard Anarkali",
    sku: "K12-120",
    category: "Kurta Set",
    group: "Tops",
    price: 670,
    images: [product22, product17],
    colors: [YELLOW],
    sizes: SIZES,
    rating: 4.8,
    reviewCount: 32,
    description:
      "Sun-drenched mustard anarkali with a flowing profile — made to move, layered for festive evenings.",
    details: defaultDetails("georgette"),
    bestSeller: true,
    newArrival: true,
  },
  {
    id: "p-blush-kurta",
    slug: "blush-kurta-set",
    name: "Blush Kurta Set",
    sku: "K12-125",
    category: "Kurta Set",
    group: "Tops",
    price: 670,
    badge: "New",
    images: [product21, pdpRel17],
    colors: [PINK, CREAM],
    sizes: SIZES,
    rating: 4.4,
    reviewCount: 8,
    description:
      "Soft blush tones with delicate print work — a gentle, versatile set for daywear and beyond.",
    details: defaultDetails("mul cotton"),
    newArrival: true,
  },
  {
    id: "p-ivory-coord",
    slug: "ivory-coord-set",
    name: "Ivory Coord Set",
    sku: "K12-128",
    category: "Coord Set",
    group: "Bottom",
    price: 650,
    images: [product23, product19],
    colors: [CREAM],
    sizes: SIZES,
    rating: 4.2,
    reviewCount: 6,
    description: "Clean ivory two-piece with an easy drape — quiet luxury for warm days.",
    details: defaultDetails("linen blend"),
    bestSeller: true,
  },
  {
    id: "p-rose-print-kurta",
    slug: "rose-print-kurta",
    name: "Rose Print Kurta",
    sku: "K12-129",
    category: "Kurta Set",
    group: "Tops",
    price: 670,
    images: [product24, product25],
    colors: [PINK, RED],
    sizes: SIZES,
    rating: 4.7,
    reviewCount: 17,
    description:
      "All-over rose print on a breathable weave — romantic, easy, endlessly wearable.",
    details: defaultDetails("cotton"),
    bestSeller: true,
    newArrival: true,
  },
  {
    id: "p-layered-kurta",
    slug: "layered-kurta",
    name: "Layered Kurta",
    sku: "K12-130",
    category: "Kurta Set",
    group: "Tops",
    price: 850,
    mrp: 1000,
    badge: "Sale",
    images: [promoImg, product17],
    colors: [VIOLET, CREAM],
    sizes: SIZES,
    rating: 4.5,
    reviewCount: 12,
    description:
      "Dimensional layers with a structured fall — the statement piece of the season, up to 15% off.",
    details: defaultDetails("chanderi"),
  },
  {
    id: "p-short-kurta",
    slug: "short-kurta",
    name: "Short Kurta",
    sku: "K12-131",
    category: "Tops",
    group: "Tops",
    price: 550,
    mrp: 598,
    badge: "Sale",
    images: [promoM6, product19],
    colors: [GREEN, CREAM],
    sizes: SIZES,
    rating: 4.0,
    reviewCount: 7,
    description:
      "A cropped, contemporary take on the classic kurta — pairs with denim as easily as with palazzos.",
    details: defaultDetails("cotton"),
  },
  {
    id: "p-scarlet-festive",
    slug: "scarlet-festive-set",
    name: "Scarlet Festive Set",
    sku: "K12-132",
    category: "Kurta Set",
    group: "Tops",
    price: 1250,
    images: [product17, pdpThumb22],
    colors: [RED],
    sizes: SIZES,
    rating: 4.9,
    reviewCount: 26,
    stockLeft: 4,
    description:
      "Occasion-ready scarlet with fine detailing — our most loved festive silhouette.",
    details: defaultDetails("silk blend"),
    bestSeller: true,
  },
  {
    id: "p-sage-coord",
    slug: "sage-coord-set",
    name: "Sage Coord Set",
    sku: "K12-133",
    category: "Coord Set",
    group: "Bottom",
    price: 720,
    images: [product19, product23],
    colors: [GREEN, CREAM],
    sizes: SIZES,
    rating: 4.3,
    reviewCount: 10,
    description:
      "Muted sage two-piece with relaxed tailoring — calm, collected, quietly confident.",
    details: defaultDetails("modal"),
    newArrival: true,
  },
];

export const FIXTURE_PRODUCTS: Product[] = raw.map(withVariants);

const byHandle = (handle: string) =>
  FIXTURE_PRODUCTS.find((p) => p.slug === handle || p.id === handle) ?? null;

/* ---- catalog interface (mirrors src/lib/shopify/catalog.ts) ---- */

export async function getAllProducts(): Promise<Product[]> {
  return FIXTURE_PRODUCTS;
}

export async function getProducts(opts: { sort?: ProductSort } = {}): Promise<Product[]> {
  const list = [...FIXTURE_PRODUCTS];
  switch (opts.sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "newest":
      // newArrival items first, otherwise keep fixture order
      return list.sort((a, b) => Number(b.newArrival ?? false) - Number(a.newArrival ?? false));
    default:
      return list; // "featured" = fixture (Shopify default) order
  }
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  return byHandle(handle);
}

export async function getCollectionProducts(
  handle: string,
  first = 24,
  _sortKey = "MANUAL",
): Promise<Product[]> {
  const set =
    handle === "new-arrivals"
      ? FIXTURE_PRODUCTS.filter((p) => p.newArrival)
      : handle === "best-sellers"
        ? FIXTURE_PRODUCTS.filter((p) => p.bestSeller)
        : FIXTURE_PRODUCTS;
  return set.slice(0, first);
}

/** Mirrors the handles the live store actually uses (note "bottom", singular —
 *  the real admin value) so the Shop links exercise the same aliasing path in
 *  dev as in production. Images borrow a representative fixture product. */
export async function getCollections(): Promise<Collection[]> {
  const imageOf = (slug: string) => byHandle(slug)?.images[0] ?? "";
  return [
    { id: "fixture:collection:dresses", handle: "dresses", title: "Dresses", image: imageOf("mustard-anarkali") },
    { id: "fixture:collection:tops", handle: "tops", title: "Tops", image: imageOf("rose-print-kurta") },
    { id: "fixture:collection:co-ords", handle: "co-ords", title: "Co-Ords", image: imageOf("ivory-coord-set") },
    { id: "fixture:collection:bottom", handle: "bottom", title: "Bottom", image: imageOf("sage-coord-set") },
  ];
}

export async function getNewArrivals(): Promise<Product[]> {
  return FIXTURE_PRODUCTS.filter((p) => p.newArrival);
}

export async function getBestSellers(): Promise<Product[]> {
  return FIXTURE_PRODUCTS.filter((p) => p.bestSeller);
}

export async function getSaleProducts(): Promise<Product[]> {
  return FIXTURE_PRODUCTS.filter((p) => p.mrp != null && p.mrp > p.price);
}
