/**
 * Reads over the reviews store, and the one shape the browser is allowed to see.
 *
 * Every public projection here names the fields it excludes rather than relying
 * on the query to omit them, so adding a moderation-only field to ReviewDoc
 * can't quietly start publishing it.
 */
import crypto from "node:crypto";
import { maskEmail } from "./http.js";
import { type ReviewDoc, isReviewsConfigured, reviewsCollection } from "./mongo.js";
import { adminGraphql, isAdminConfigured } from "./shopify.js";

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

/* --- Aggregates written back to Shopify ----------------------------------- *
 * The storefront reads a product's rating off the catalog object it already
 * loads (custom.review_rating / custom.review_count — see
 * src/lib/shopify/queries.ts). Keeping the aggregate there rather than
 * computing it in the browser is what lets the PDP summary, the quick view and
 * Shop the Hits all show stars with NO extra fetch: the alternative is a second
 * request before the PDP's above-the-fold summary and a whole-catalog aggregate
 * call on the homepage just to sort one section.                              */

/** Shopify's own namespace is reserved for review apps and refuses our writes,
 *  so these are ours. Must stay in step with src/lib/shopify/queries.ts. */
const MF_NS = "custom";
const MF_RATING = "review_rating";
const MF_COUNT = "review_count";

const MF_SET = /* GraphQL */ `
  mutation ReviewAggregateSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      userErrors { field message }
    }
  }
`;

const MF_DELETE = /* GraphQL */ `
  mutation ReviewAggregateDelete($metafields: [MetafieldIdentifierInput!]!) {
    metafieldsDelete(metafields: $metafields) {
      deletedMetafields { key }
      userErrors { field message }
    }
  }
`;

/**
 * Recompute one product's rating from its approved reviews and write it to
 * Shopify. Call after anything that changes which reviews are approved:
 * approving, hiding an approved one, deleting, editing a rating, or the client
 * authoring one herself.
 *
 * BEST-EFFORT, like writeFlag in audience.ts. A Shopify hiccup must not fail her
 * moderation click — the review is already saved in Mongo by the time we get
 * here, and the `resync` admin op exists to repair any drift. Errors are logged,
 * never thrown.
 */
export async function recomputeAggregate(productGid: string): Promise<void> {
  if (!productGid || !isAdminConfigured()) return;
  let agg: { count: number; avg: number | null };
  try {
    agg = await aggregateFor(productGid);
  } catch (err) {
    console.error("[reviews] aggregate read failed:", err);
    return;
  }
  const { count, avg } = agg;

  try {
    if (count === 0 || avg === null) {
      /* Both keys, not just the count. The PDP guards its count text on
         reviewCount > 0 but its STARS on rating > 0, so leaving a rating behind
         would show four stars with no reviews under them. */
      const res = await adminGraphql(MF_DELETE, {
        metafields: [
          { ownerId: productGid, namespace: MF_NS, key: MF_RATING },
          { ownerId: productGid, namespace: MF_NS, key: MF_COUNT },
        ],
      });
      logErrors("metafieldsDelete", await res.json());
      return;
    }

    /* toFixed(1) here, not at render time: transform.ts hands the raw number
       straight to the PDP, so a mean of 13/3 would print as
       4.333333333333333 under the stars. */
    const res = await adminGraphql(MF_SET, {
      metafields: [
        {
          ownerId: productGid,
          namespace: MF_NS,
          key: MF_RATING,
          type: "rating",
          value: JSON.stringify({ value: avg.toFixed(1), scale_min: "1", scale_max: "5" }),
        },
        {
          ownerId: productGid,
          namespace: MF_NS,
          key: MF_COUNT,
          type: "number_integer",
          value: String(count),
        },
      ],
    });
    logErrors("metafieldsSet", await res.json());
  } catch (err) {
    console.error("[reviews] aggregate write failed:", err);
  }
}

function logErrors(op: string, json: unknown): void {
  const payload = json as {
    data?: Record<string, { userErrors?: { field?: string[]; message: string }[] }>;
    errors?: { message: string }[];
  };
  if (payload.errors?.length) {
    console.error(`[reviews] ${op}:`, payload.errors.map((e) => e.message).join("; "));
  }
  for (const result of Object.values(payload.data ?? {})) {
    const errs = result?.userErrors ?? [];
    if (errs.length) console.error(`[reviews] ${op}:`, errs.map((e) => e.message).join("; "));
  }
}

const PRODUCTS_WITH_AGGREGATE = /* GraphQL */ `
  query ProductsWithReviewAggregate($cursor: String) {
    products(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        rating: metafield(namespace: "${MF_NS}", key: "${MF_RATING}") { id }
        count: metafield(namespace: "${MF_NS}", key: "${MF_COUNT}") { id }
      }
    }
  }
`;

/**
 * The repair tool's work list.
 *
 * Products that still hold a review, UNION products that currently carry a
 * rating metafield. The second half is the point: a product whose last review
 * was deleted has no document left, so a Mongo-only list could never clear the
 * stars it was left showing — which is exactly the drift `resync` exists to
 * repair, since the aggregate write is best-effort and can fail silently.
 */
export async function productGidsToResync(): Promise<string[]> {
  const gids = new Set<string>();

  if (isReviewsConfigured()) {
    const col = await reviewsCollection();
    for (const g of await col.distinct("productGid", {})) {
      if (typeof g === "string" && g) gids.add(g);
    }
  }

  if (isAdminConfigured()) {
    try {
      let cursor: string | null = null;
      for (let page = 0; page < 20; page++) {
        const res = await adminGraphql(PRODUCTS_WITH_AGGREGATE, { cursor });
        const json = (await res.json()) as {
          data?: {
            products?: {
              pageInfo?: { hasNextPage?: boolean; endCursor?: string };
              nodes?: { id: string; rating?: unknown; count?: unknown }[];
            };
          };
        };
        const conn = json.data?.products;
        for (const n of conn?.nodes ?? []) {
          if (n.rating || n.count) gids.add(n.id);
        }
        if (!conn?.pageInfo?.hasNextPage || !conn.pageInfo.endCursor) break;
        cursor = conn.pageInfo.endCursor;
      }
    } catch (err) {
      /* Still resync everything Mongo knows about. */
      console.error("[reviews] resync could not list products with an aggregate:", err);
    }
  }

  return [...gids];
}

/* --- Writes and moderation ------------------------------------------------ */

/** Field limits. Enforced here rather than only in the form, because `submit` is
 *  a public endpoint and a form is not a validator. */
export const LIMITS = { author: 40, title: 80, body: 1200, photos: 5 } as const;

export interface ReviewInput {
  productGid: string;
  productHandle?: string;
  productName?: string;
  author: string;
  title: string;
  body: string;
  rating: number;
  photos?: { gid: string; url: string }[];
  verified?: boolean;
  email?: string;
  ipHash?: string;
  userAgent?: string;
}

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";

/**
 * Coerce untrusted input into a review, or explain why it isn't one.
 *
 * The rating is snapped to a half step and clamped to 1–5 rather than rejected,
 * since the only way to send something else is to bypass the star widget.
 */
export function readInput(body: Record<string, unknown>): { error: string } | ReviewInput {
  const productGid = str(body.productGid, 120);
  if (!productGid.startsWith("gid://shopify/Product/")) return { error: "bad_product" };

  const author = str(body.author, LIMITS.author);
  const title = str(body.title, LIMITS.title);
  const text = str(body.body, LIMITS.body);
  if (!author || !title || !text) return { error: "missing_fields" };

  /* Reject anything below 1 rather than clamping it up. `Number(0)`, and the 0
     that null/false/"" all coerce to, are finite — so a clamp turned "no rating
     supplied" into a ONE-STAR review published under the customer's real name
     and dragging that product's average down. Only the upper bound is clamped,
     where rounding down is harmless. */
  const raw = Number(body.rating);
  if (!Number.isFinite(raw) || raw < 1) return { error: "bad_rating" };
  const rating = Math.min(5, Math.round(raw * 2) / 2);

  return {
    productGid,
    productHandle: str(body.productHandle, 120) || undefined,
    productName: str(body.productName, 120) || undefined,
    author,
    title,
    body: text,
    rating,
  };
}

/** Insert a review. `status` is the caller's decision: the client's own entries
 *  go straight in as approved, a shopper's arrive pending. */
export async function insertReview(
  input: ReviewInput,
  status: ReviewDoc["status"],
  source: ReviewDoc["source"],
): Promise<string> {
  const col = await reviewsCollection();
  const now = new Date();
  const doc: ReviewDoc = {
    _id: crypto.randomUUID(),
    status,
    source,
    productGid: input.productGid,
    productHandle: input.productHandle,
    productName: input.productName,
    author: input.author,
    title: input.title,
    body: input.body,
    rating: input.rating,
    verified: input.verified ?? false,
    photos: (input.photos ?? []).map((p) => p.url),
    photoGids: (input.photos ?? []).map((p) => p.gid),
    createdAt: now,
    updatedAt: now,
    ...(status === "approved" ? { publishedAt: now } : {}),
    email: input.email,
    ipHash: input.ipHash,
    userAgent: input.userAgent,
  };
  await col.insertOne(doc);
  return doc._id;
}

/** A review as the MODERATION screen sees it: everything the public shape has,
 *  plus the state she is acting on. The email is masked — enough to tell two
 *  reviewers apart without spraying a customer's address through the UI. */
export interface AdminReview extends PublicReview {
  status: ReviewDoc["status"];
  source: ReviewDoc["source"];
  wallRank?: number;
  submitted: string;
  maskedEmail?: string;
  photoGids: string[];
}

function toAdmin(doc: ReviewDoc): AdminReview {
  return {
    ...toPublic(doc),
    status: doc.status,
    source: doc.source,
    wallRank: doc.wallRank,
    submitted: doc.createdAt.toISOString().slice(0, 10),
    maskedEmail: doc.email ? maskEmail(doc.email) : undefined,
    photoGids: doc.photoGids ?? [],
  };
}

/** The moderation queue. Pending first — that's what she has to act on — then
 *  everything else newest-first. */
export async function adminList(status?: ReviewDoc["status"]): Promise<AdminReview[]> {
  if (!isReviewsConfigured()) return [];
  const col = await reviewsCollection();

  /* Two queries, unioned, because the cap is otherwise dangerous rather than
     merely limiting: the console derives the homepage wall from this list, and
     the reorder buttons send back the ids they can see. A featured review that
     had aged out of the newest N would be absent from that list, so writing the
     order would clear its wallRank and drop it off the homepage with nobody
     touching it. Featured reviews are at most WALL_SIZE, so asking for them
     unconditionally costs nothing and makes that impossible. */
  const [featured, recent] = await Promise.all([
    col.find({ wallRank: { $gte: 1, $lte: WALL_SIZE } }, { sort: { wallRank: 1 } }).toArray(),
    col.find(status ? { status } : {}, { sort: { createdAt: -1 }, limit: 500 }).toArray(),
  ]);

  const byId = new Map<string, ReviewDoc>();
  for (const d of [...featured, ...recent]) byId.set(d._id, d);

  /* Pending first — that's what she has to act on — then the rest newest-first. */
  const rank = { pending: 0, approved: 1, rejected: 2 };
  return [...byId.values()]
    .sort((a, b) => rank[a.status] - rank[b.status] || +b.createdAt - +a.createdAt)
    .map(toAdmin);
}

/** Load one review — used to find the product whose aggregate needs recomputing
 *  after a change, and the photos to clean up on delete. */
export async function findReview(id: string): Promise<ReviewDoc | null> {
  if (!isReviewsConfigured()) return null;
  const col = await reviewsCollection();
  return col.findOne({ _id: id });
}

/**
 * Approve or hide a review.
 *
 * `publishedAt` is stamped on the FIRST approval and never moved, so hiding a
 * review and approving it again doesn't jump it to the top of the product page.
 * Hiding also clears any wall position: a review she has pulled must not keep
 * its slot on the homepage.
 */
export async function setStatus(id: string, status: ReviewDoc["status"]): Promise<boolean> {
  const col = await reviewsCollection();
  const doc = await col.findOne({ _id: id });
  if (!doc) return false;
  const now = new Date();

  if (status === "approved") {
    const set: Partial<ReviewDoc> = { status, updatedAt: now };
    if (!doc.publishedAt) set.publishedAt = now;
    await col.updateOne({ _id: id }, { $set: set });
    return true;
  }

  await col.updateOne({ _id: id }, { $set: { status, updatedAt: now }, $unset: { wallRank: "" } });
  /* Close the gap it left, so wall positions stay a dense 1..n and the fixtures
     keep backfilling from the end rather than from a hole in the middle. */
  if (doc.wallRank) await writeWallOrder(await wallOrder());
  return true;
}

/** Delete a review outright. Returns its photo GIDs so the caller can remove the
 *  files, and its product so the aggregate can be recomputed. */
export async function deleteReview(id: string): Promise<ReviewDoc | null> {
  const col = await reviewsCollection();
  const doc = await col.findOne({ _id: id });
  if (!doc) return null;
  await col.deleteOne({ _id: id });
  return doc;
}

/** The featured reviews, in wall order — ids only. */
export async function wallOrder(): Promise<string[]> {
  const col = await reviewsCollection();
  const docs = await col
    .find({ wallRank: { $gte: 1, $lte: WALL_SIZE } }, { projection: { _id: 1 }, sort: { wallRank: 1 } })
    .toArray();
  return docs.map((d) => d._id);
}

/**
 * Write the wall order as a dense 1..n run.
 *
 * Every rank is cleared before any is assigned, in one ORDERED bulk write. Both
 * halves are needed: the unique index would reject a straight re-number the
 * moment two reviews briefly shared a position, and clearing first is also what
 * guarantees the result has no holes in it.
 */
async function writeWallOrder(ids: string[]): Promise<void> {
  const col = await reviewsCollection();
  const wanted = ids.slice(0, WALL_SIZE);
  await col.bulkWrite(
    [
      /* Filtered, not `{}`: an unfiltered updateMany would rewrite every review
         in the collection on each reorder. This touches only the handful that
         actually hold a position, and uses the partial index to find them. */
      {
        updateMany: {
          filter: { wallRank: { $gte: 1, $lte: WALL_SIZE } },
          update: { $unset: { wallRank: "" } },
        },
      },
      ...wanted.map((id, i) => ({
        updateOne: {
          filter: { _id: id, status: "approved" as const },
          update: { $set: { wallRank: i + 1, updatedAt: new Date() } },
        },
      })),
    ],
    { ordered: true },
  );
}

/** Put a review on the wall, at the end. Returns false when all nine slots are
 *  taken — she unfeatures something first, rather than us silently evicting a
 *  pick she made. */
export async function featureReview(id: string): Promise<boolean> {
  const order = await wallOrder();
  if (order.includes(id)) return true;
  if (order.length >= WALL_SIZE) return false;
  await writeWallOrder([...order, id]);
  return true;
}

/** Take a review off the wall. The ones below it close up, so positions stay a
 *  dense 1..n and the fixtures always backfill from the end. */
export async function unfeatureReview(id: string): Promise<void> {
  const order = await wallOrder();
  await writeWallOrder(order.filter((x) => x !== id));
}

/** Set the whole wall order at once — what the up/down buttons send. */
export async function reorderWall(ids: unknown): Promise<void> {
  if (!Array.isArray(ids)) return;
  await writeWallOrder(ids.filter((x): x is string => typeof x === "string"));
}

/**
 * Has this person already reviewed this piece?
 *
 * Only counts reviews a CUSTOMER filed. The client legitimately types up several
 * under her own address — that's why the {email, productGid} index is not unique
 * — so her entries must not lock a real buyer out of reviewing.
 *
 * The rate limit stops a burst; this stops the slow version, where one invite
 * link is used to file a review a day for a month.
 */
export async function alreadyReviewed(email: string, productGid: string): Promise<boolean> {
  if (!email || !productGid) return false;
  const col = await reviewsCollection();
  const existing = await col.findOne(
    { email: email.toLowerCase(), productGid, source: "customer" },
    { projection: { _id: 1 } },
  );
  return existing !== null;
}

const PRODUCT_LABEL = /* GraphQL */ `
  query ReviewProductLabel($id: ID!) {
    product(id: $id) { handle title }
  }
`;

/**
 * The display name and handle for a product GID, straight from Shopify.
 *
 * Used so a public submission can't choose the label its words appear under, and
 * so the stored label matches the catalog at the time of writing. Returns empty
 * fields rather than throwing — a review is worth more than its chip.
 */
export async function lookUpProduct(
  productGid: string,
): Promise<{ name?: string; handle?: string }> {
  if (!productGid || !isAdminConfigured()) return {};
  try {
    const res = await adminGraphql(PRODUCT_LABEL, { id: productGid });
    const json = (await res.json()) as {
      data?: { product?: { handle?: string | null; title?: string | null } | null };
    };
    const p = json.data?.product;
    if (!p) return {};
    return { name: p.title ?? undefined, handle: p.handle ?? undefined };
  } catch (err) {
    console.error("[reviews] product label lookup failed:", err);
    return {};
  }
}
