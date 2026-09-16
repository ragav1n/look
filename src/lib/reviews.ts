/**
 * Reviews — the SPA half. Reads from /api/reviews (see api/reviews.ts).
 *
 * Nothing in here throws. Both callers render something useful with no reviews
 * at all — the homepage wall falls back to its hand-written notes, the PDP panel
 * reads "Reviews (0)" — so a failure returning an empty list degrades to exactly
 * that, while a rejection would blank a whole section. Plain `npm run dev`
 * serves no /api routes, so this is also what keeps the storefront browsable
 * without the BFF running.
 */
import type { Review } from "@/types";

async function readReviews(url: string): Promise<Review[]> {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return [];
    const data = (await res.json()) as { reviews?: Review[] };
    return Array.isArray(data.reviews) ? data.reviews : [];
  } catch {
    return [];
  }
}

/** The client's curated homepage picks, in her chosen order. Usually fewer than
 *  nine; composeWall() backfills the rest. */
export const getWallReviews = (): Promise<Review[]> => readReviews("/api/reviews?action=wall");

/** Approved reviews for one product, newest first. Keyed on the Shopify GID
 *  rather than the handle, so renaming a product doesn't orphan its reviews. */
export const getProductReviews = (productGid: string): Promise<Review[]> =>
  productGid
    ? readReviews(`/api/reviews?action=list&product=${encodeURIComponent(productGid)}`)
    : Promise.resolve([]);

/**
 * Ask Shopify's CDN for a resized copy of a file it hosts.
 *
 * Review photos are stored ONCE at 1200px and every smaller surface is served
 * from that same upload — the wall avatar at 96, the PDP thumbnail strip at 240,
 * the lightbox at full size. cdn.shopify.com honours `?width=N`, so this costs
 * no extra storage and saves the homepage pulling a full photo per avatar.
 *
 * Only rewrites Shopify URLs. Anything else (a bundled fixture avatar, a data:
 * URL) is returned untouched.
 */
export function cdnResize(url: string, width: number): string {
  if (!url.includes("cdn.shopify.com")) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("width", String(width));
    return u.toString();
  } catch {
    return url;
  }
}
