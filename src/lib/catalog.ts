/**
 * Public catalog data layer. Components import *only* from here — never from the
 * fixtures or the Shopify modules directly. When VITE_SHOPIFY_* env vars are
 * present the live Storefront API is used; otherwise the dev fixtures back it,
 * so the app renders during development without a store connected.
 */
import { isShopifyConfigured } from "./shopify/client";
import * as live from "./shopify/catalog";
import * as fixture from "./fixtures/catalog";

const impl = isShopifyConfigured ? live : fixture;

export const getAllProducts = impl.getAllProducts;
export const getProducts = impl.getProducts;
export const getProductByHandle = impl.getProductByHandle;
export const getCollectionProducts = impl.getCollectionProducts;
export const getCollections = impl.getCollections;
export const getNewArrivals = impl.getNewArrivals;
export const getBestSellers = impl.getBestSellers;
export const getSaleProducts = impl.getSaleProducts;

export { isShopifyConfigured };
