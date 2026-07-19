import type { Collection, Product, ProductSort } from "@/types";
import { storefront } from "./client";
import {
  COLLECTION_PRODUCTS_QUERY,
  COLLECTIONS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  PRODUCT_HANDLES_QUERY,
  PRODUCTS_QUERY,
} from "./queries";
import { toCollection, toProduct } from "./transform";
import type { SFCollection, SFProduct } from "./types";

/** Live Storefront API catalog. Product order always comes from Shopify's own
 *  sort keys (or a collection's admin-configured order) — never re-sorted here. */

const SORT_MAP: Record<ProductSort, { sortKey: string; reverse: boolean }> = {
  featured: { sortKey: "BEST_SELLING", reverse: false },
  "price-asc": { sortKey: "PRICE", reverse: false },
  "price-desc": { sortKey: "PRICE", reverse: true },
  newest: { sortKey: "CREATED_AT", reverse: true },
};

export async function getAllProducts(): Promise<Product[]> {
  const data = await storefront<{ products: { nodes: SFProduct[] } }>(PRODUCTS_QUERY, {
    first: 50,
    sortKey: "BEST_SELLING",
  });
  return data.products.nodes.map(toProduct);
}

/** Shop listing — sort is pushed to Shopify's sort key, not re-sorted locally. */
export async function getProducts(opts: { sort?: ProductSort } = {}): Promise<Product[]> {
  const { sortKey, reverse } = SORT_MAP[opts.sort ?? "featured"];
  const data = await storefront<{ products: { nodes: SFProduct[] } }>(PRODUCTS_QUERY, {
    first: 50,
    sortKey,
    reverse,
  });
  return data.products.nodes.map(toProduct);
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  const data = await storefront<{ product: SFProduct | null }>(PRODUCT_BY_HANDLE_QUERY, { handle });
  return data.product ? toProduct(data.product) : null;
}

/** `sortKey: "MANUAL"` honours the drag order set on the collection in the admin.
 *  "COLLECTION_DEFAULT" instead follows the collection's *sort dropdown*, which
 *  silently ignores that drag order unless the dropdown is also set to Manual —
 *  so curated collections (the hero) must ask for MANUAL explicitly. */
export async function getCollectionProducts(
  handle: string,
  first = 24,
  sortKey = "MANUAL",
): Promise<Product[]> {
  const data = await storefront<{ collection: { products: { nodes: SFProduct[] } } | null }>(
    COLLECTION_PRODUCTS_QUERY,
    { handle, first, sortKey },
  );
  return data.collection?.products.nodes.map(toProduct) ?? [];
}

/** Every collection in the store, in the admin's own order. Callers decide which
 *  are browsable categories (see NON_CATEGORY_COLLECTIONS). */
export async function getCollections(): Promise<Collection[]> {
  const data = await storefront<{ collections: { nodes: SFCollection[] } }>(COLLECTIONS_QUERY, {
    // Past this the admin silently loses category tiles with no error.
    first: 100,
  });
  return data.collections.nodes.map(toCollection);
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

/**
 * Map Shopify product GIDs to their handles.
 *
 * Order line items carry a `productId` but no handle — the Customer Account API
 * simply doesn't expose one — so linking an ordered item back to its product
 * page needs this second lookup against the Storefront API.
 *
 * Resolves to `{}` rather than throwing: a failed lookup should cost the links,
 * not the order page around them. Ids that no longer resolve (deleted or
 * unpublished products) are absent from the result, and render unlinked.
 */
export async function getProductHandles(productIds: string[]): Promise<Record<string, string>> {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (ids.length === 0) return {};

  try {
    const data = await storefront<{ nodes: ({ id: string; handle?: string } | null)[] }>(
      PRODUCT_HANDLES_QUERY,
      { ids },
    );
    return Object.fromEntries(
      data.nodes
        .filter((n): n is { id: string; handle: string } => Boolean(n?.handle))
        .map((n) => [n.id, n.handle]),
    );
  } catch {
    return {};
  }
}
