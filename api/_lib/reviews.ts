/**
 * Reads over the reviews store, and the one shape the browser is allowed to see.
 *
 * Every public projection here names the fields it excludes rather than relying
 * on the query to omit them, so adding a moderation-only field to ReviewDoc
 * can't quietly start publishing it.
 */
import { type ReviewDoc, isReviewsConfigured, reviewsCollection } from "./mongo.js";

/** How many notes the homepage wall holds. Mirrors WALL_SIZE in
 *  src/data/reviewWall.ts — the app and the BFF can't share a module, and nine
 *  is a layout fact (a 3-column masonry only bottoms out on a multiple of
 *  three), so it's stated in both places rather than passed in by the client. */
export const WALL_SIZE = 9;

/**
 * A review as the browser sees it. Deliberately the same shape as `Review` in
 * src/types/index.ts, so the wall and the PDP render a stored review and a
 * hand-written fixture through exactly the same component.
 *
 * `productId` carries the Shopify GID. It is safe to publish — the storefront
 * already exposes product GIDs — and it's what the PDP matches on.
 */
export interface PublicReview {
  id: string;
  productId: string;
  productName?: string;
  productHandle?: string;
  author: string;
  rating: number;
  /** ISO date (YYYY-MM-DD), matching the fixtures the wall falls back to. */
  date: string;
  title: string;
  body: string;
  verified: boolean;
  photos?: string[];
  avatar?: string;
}

/** Strip a stored document down to what may leave the server. */
export function toPublic(doc: ReviewDoc): PublicReview {
  const when = doc.publishedAt ?? doc.createdAt;
  return {
    id: doc._id,
    productId: doc.productGid,
    productName: doc.productName,
    productHandle: doc.productHandle,
    author: doc.author,
    rating: doc.rating,
    date: when instanceof Date ? when.toISOString().slice(0, 10) : String(when).slice(0, 10),
    title: doc.title,
    body: doc.body,
    verified: doc.verified,
    photos: doc.photos?.length ? doc.photos : undefined,
    avatar: doc.avatar,
  };
}

/* Never sent to the browser. Listed by name so the exclusion is explicit and a
   new moderation-only field on ReviewDoc has to be added here deliberately. */
const HIDDEN = { email: 0, ipHash: 0, userAgent: 0 } as const;

/**
 * The homepage wall's curated picks, in the order the client gave them.
 *
 * Returns only what she has featured — usually fewer than nine, often none —
 * and the app backfills the rest from the hand-written fixtures. Sorting on
 * wallRank rather than on a date is the whole point: she chooses the order.
 */
export async function getWall(): Promise<PublicReview[]> {
  if (!isReviewsConfigured()) return [];
  const col = await reviewsCollection();
  const docs = await col
    .find(
      /* A range rather than `$exists` or `$type` so the query is provably a
         SUBSET of the partial index's filter ({ wallRank: { $type: "number" } })
         and can therefore use it — `$exists: true` would also match a
         non-numeric value and would quietly fall back to a collection scan. */
      { status: "approved", wallRank: { $gte: 1, $lte: WALL_SIZE } },
      { projection: HIDDEN, sort: { wallRank: 1 }, limit: WALL_SIZE },
    )
    .toArray();
  return docs.map(toPublic);
}

/** Approved reviews for one product, newest first. */
export async function listForProduct(productGid: string, limit = 50): Promise<PublicReview[]> {
  if (!isReviewsConfigured() || !productGid) return [];
  const col = await reviewsCollection();
  const docs = await col
    .find(
      { productGid, status: "approved" },
      { projection: HIDDEN, sort: { publishedAt: -1, _id: 1 }, limit },
    )
    .toArray();
  return docs.map(toPublic);
}

/**
 * A product's rating and review count, computed from approved reviews only.
 *
 * Phase 3 writes this back to Shopify's `reviews.rating` / `rating_count`
 * metafields so the PDP summary, the quick view and Shop the Hits all keep
 * reading it off the catalog object they already load, with no extra fetch.
 * `avg` is rounded to one decimal at the point of use, not here, so callers
 * that want the raw mean can have it.
 */
export async function aggregateFor(
  productGid: string,
): Promise<{ count: number; avg: number | null }> {
  if (!isReviewsConfigured() || !productGid) return { count: 0, avg: null };
  const col = await reviewsCollection();
  const [row] = await col
    .aggregate<{ count: number; avg: number }>([
      { $match: { productGid, status: "approved" } },
      { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: "$rating" } } },
    ])
    .toArray();
  return row ? { count: row.count, avg: row.avg } : { count: 0, avg: null };
}
