import type { Product } from "@/types";
import { storefront } from "./client";
import {
  COLLECTION_PRODUCTS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  PRODUCTS_QUERY,
} from "./queries";
import { toProduct } from "./transform";
import type { SFProduct } from "./types";

/** Live Storefront API catalog. Product order always comes from Shopify's own
 *  sort keys (or a collection's admin-configured order) — never re-sorted here. */

export async function getAllProducts(): Promise<Product[]> {
  const data = await storefront<{ products: { nodes: SFProduct[] } }>(PRODUCTS_QUERY, {
    first: 50,
    sortKey: "BEST_SELLING",
  });
  return data.products.nodes.map(toProduct);
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  const data = await storefront<{ product: SFProduct | null }>(PRODUCT_BY_HANDLE_QUERY, { handle });
  return data.product ? toProduct(data.product) : null;
}

export async function getCollectionProducts(handle: string, first = 24): Promise<Product[]> {
  const data = await storefront<{ collection: { products: { nodes: SFProduct[] } } | null }>(
    COLLECTION_PRODUCTS_QUERY,
    { handle, first, sortKey: "COLLECTION_DEFAULT" },
  );
  return data.collection?.products.nodes.map(toProduct) ?? [];
}

export async function getNewArrivals(): Promise<Product[]> {
  const data = await storefront<{ products: { nodes: SFProduct[] } }>(PRODUCTS_QUERY, {
    first: 6,
    sortKey: "CREATED_AT",
    reverse: true,
  });
  return data.products.nodes.map(toProduct);
}

export async function getBestSellers(): Promise<Product[]> {
  const data = await storefront<{ products: { nodes: SFProduct[] } }>(PRODUCTS_QUERY, {
    first: 12,
    sortKey: "BEST_SELLING",
  });
  return data.products.nodes.map(toProduct);
}

export async function getSaleProducts(): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.mrp != null && p.mrp > p.price);
}
