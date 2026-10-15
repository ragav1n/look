/**
 * Public catalog data layer. Components import *only* from here — never from the
 * fixtures or the Shopify modules directly. When VITE_SHOPIFY_* env vars are
 * present the live Storefront API is used; otherwise the dev fixtures back it,
 * so the app renders during development without a store connected.
 */
import { isShopifyConfigured } from "./shopify/client";
import * as live from "./shopify/catalog";
import * as fixture from "./fixtures/catalog";
import { IMG_SIZES, preloadImg } from "./image";

const impl = isShopifyConfigured ? live : fixture;

export const getAllProducts = impl.getAllProducts;
export const getProducts = impl.getProducts;
export const getProductByHandle = impl.getProductByHandle;
export const getCollectionProducts = impl.getCollectionProducts;
export const getCollections = impl.getCollections;
export const getReels = impl.getReels;
export const getPromo = impl.getPromo;
export const getNewArrivals = impl.getNewArrivals;
export const getBestSellers = impl.getBestSellers;
export const getSaleProducts = impl.getSaleProducts;
export const getProductHandles = impl.getProductHandles;

export { isShopifyConfigured };

/** Warm a product page before it is opened: its data (through the live
 *  catalog's short cache) and its first photo at the PDP's size. Called on
 *  card hover, focus and touch, so the click lands on a page that's ready. */
export function prefetchProduct(product: { slug: string; images: string[] }): void {
  void getProductByHandle(product.slug).catch(() => {});
  void preloadImg(product.images[0], IMG_SIZES.pdpMain);
}

/** Spread onto anything that links to a product page. Pointer covers desktop
 *  hover, touchstart gives a phone the ~100ms before the tap completes. */
export const prefetchOn = (product: { slug: string; images: string[] }) => {
  const warm = () => prefetchProduct(product);
  return { onPointerEnter: warm, onFocus: warm, onTouchStart: warm };
};
