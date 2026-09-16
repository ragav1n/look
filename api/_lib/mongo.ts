/**
 * MongoDB Atlas connection for the reviews store — the project's first database.
 *
 * Reviews don't belong in Shopify. Its own product reviews are an app's job, the
 * metafield route has no moderation queue, and the client wanted a store she
 * owns outright after Judge.me turned out to cost $15/mo for the useful tier.
 * What DOES stay in Shopify is the aggregate (the custom.review_rating /
 * custom.review_count metafields), so the catalog the storefront already loads
 * carries the star rating and no page needs a second fetch to show it. Photos live in Shopify
 * Files for the same reason: cdn.shopify.com is already allowed by our CSP.
 *
 * Two behaviours here are load-bearing on a serverless runtime:
 *
 * 1. The connect PROMISE is memoised, not the client. Several invocations can
 *    share one warm instance and they must share one handshake rather than
 *    racing to open their own. The memo is nulled if it rejects — memoising a
 *    rejected promise would poison that instance for the rest of its life.
 * 2. The pool is deliberately tiny and `close()` is never called. Many warm
 *    instances multiplied by the driver's default pool of 100 would exhaust
 *    Atlas's connection limit, and closing would throw away the warm reuse the
 *    memo exists to get.
 */
import crypto from "node:crypto";
import { MongoClient, type Collection, type Db } from "mongodb";
import { config } from "./shopify.js";

const uri = process.env.MONGODB_URI?.trim() || "";
const dbName = process.env.MONGODB_DB?.trim() || "look";

/** Collection names, exported so a maintenance script can't typo one. */
export const REVIEWS = "reviews";
export const REVIEW_REQUESTS = "review_requests";

/**
 * Whether the reviews store is reachable at all.
 *
 * Callers must check this instead of assuming, because this module deliberately
 * does NOT throw on a missing MONGODB_URI. A missing connection string is a
 * capability gap, not a security hole: throwing at module load would 500 the
 * public GET and take out both the PDP reviews panel and the homepage wall for
 * no security benefit at all. Reads degrade to an empty list and writes answer
 * 503, which also makes unsetting MONGODB_URI a one-variable kill switch — the
 * rollback for every phase of this feature, with no deploy needed.
 */
export const isReviewsConfigured = (): boolean => Boolean(uri);

/* The one case that IS a security invariant, so it fails closed exactly the way
   the COOKIE_SECRET check in shopify.ts does: credentials and customer email
   addresses crossing the public internet in the clear. `mongodb+srv://` always
   implies TLS; a plain `mongodb://` does not. Localhost is left alone. */
if (uri && config.secureCookies && !isTlsUri(uri)) {
  throw new Error(
    "MONGODB_URI must use TLS on an https deployment — refusing to send credentials in the clear.",
  );
}

function isTlsUri(u: string): boolean {
  return u.startsWith("mongodb+srv://") || /[?&](tls|ssl)=true\b/i.test(u);
}

/**
 * One review document. `_id` IS the review id — no second identifier to keep in
 * step, and it gives uniqueness for free.
 *
 * `email`, `ipHash` and `userAgent` are collected for moderation and abuse
 * handling and are NEVER served to the browser; the public projections in
 * reviews.ts exclude them by name rather than by omission, so adding a field
 * here can't accidentally publish it.
 */
export interface ReviewDoc {
  _id: string;
  status: "pending" | "approved" | "rejected";
  /** "owner" = the client typed it in herself from Instagram or WhatsApp. */
  source: "customer" | "owner";
  /** Shopify product GID. Queried on the GID rather than the handle because a
   *  rename changes the handle and would orphan every review on that product. */
  productGid: string;
  productHandle?: string;
  productName?: string;
  author: string;
  title: string;
  body: string;
  /** 1–5 in half steps. */
  rating: number;
  verified: boolean;
  /** cdn.shopify.com URLs, stored at 1200px. */
  photos: string[];
  /** The Shopify File GIDs behind `photos`, so deleting a review can delete them. */
  photoGids: string[];
  avatar?: string;
  /** 1–9 when featured on the homepage wall, absent otherwise. See the partial
   *  unique index below: "one review per wall position" is a database
   *  invariant, not something every handler has to remember. */
  wallRank?: number;
  createdAt: Date;
  /** When it was first approved — what the wall and the PDP sort on. */
  publishedAt?: Date;
  updatedAt: Date;
  /* Moderation-only, never served. */
  email?: string;
  ipHash?: string;
  userAgent?: string;
}

let connecting: Promise<Db> | null = null;

/** Connect (or reuse the warm connection) and hand back the database. */
export function getDb(): Promise<Db> {
  if (!uri) return Promise.reject(new Error("MONGODB_URI is not set"));
  if (connecting) return connecting;

  connecting = (async () => {
    const client = new MongoClient(uri, {
      /* Small on purpose. Every warm function instance keeps its own pool, so
         the driver's default of 100 would burn through Atlas's limit with a
         handful of instances. Five is plenty for one request at a time. */
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 60_000,
      /* Fail fast rather than hanging a page load. Atlas M0 also PAUSES after
         ~60 days idle, and a paused cluster is exactly what this timeout is
         protecting the storefront from. */
      serverSelectionTimeoutMS: 5_000,
    });
    await client.connect();
    const db = client.db(dbName);
    /* Inside the memoised promise, so it runs once per instance rather than
       once per request. createIndex is idempotent. */
    await ensureIndexes(db);
    return db;
  })();

  /* A rejected promise must not be cached: one failed connect — a paused
     cluster, a cold-start blip — would otherwise poison this instance forever
     and every later request would replay the same stale failure. */
  connecting.catch(() => {
    connecting = null;
  });

  return connecting;
}

/**
 * One row per review request we've emailed, so nobody is asked twice about the
 * same piece.
 *
 * In Mongo rather than as an order tag in Shopify on purpose: tagging an order
 * needs the write_orders scope, which this app does not have and does not
 * otherwise need. `_id` is `${orderId}|${productGid}`, so the uniqueness is the
 * primary key and a double-send is impossible rather than merely unlikely —
 * which matters because Hobby crons can fire more than once in their window.
 */
export interface ReviewRequestDoc {
  _id: string;
  orderId: string;
  productGid: string;
  email: string;
  sentAt: Date;
}

/** The review-requests collection, typed. */
export async function requestsCollection(): Promise<Collection<ReviewRequestDoc>> {
  const db = await getDb();
  return db.collection<ReviewRequestDoc>(REVIEW_REQUESTS);
}

/** The reviews collection, typed. */
export async function reviewsCollection(): Promise<Collection<ReviewDoc>> {
  const db = await getDb();
  return db.collection<ReviewDoc>(REVIEWS);
}

async function ensureIndexes(db: Db): Promise<void> {
  const col = db.collection<ReviewDoc>(REVIEWS);
  await col.createIndexes([
    /* The PDP read: approved reviews for one product, newest first. */
    { key: { productGid: 1, status: 1, publishedAt: -1 }, name: "product_status_published" },
    /* The moderation queue: everything pending, oldest first. */
    { key: { status: 1, createdAt: -1 }, name: "status_created" },
    /* "has this person already reviewed this piece?" — non-unique on purpose,
       since the client legitimately authors several under her own address. */
    { key: { email: 1, productGid: 1 }, name: "email_product" },
    /* One review per wall position, enforced by the database rather than by
       whichever handler last touched wallRank. Partial, so the thousands of
       unfeatured reviews with no wallRank don't all collide on null. */
    {
      key: { wallRank: 1 },
      name: "wall_rank_unique",
      unique: true,
      partialFilterExpression: { wallRank: { $type: "number" } },
    },
  ]);
}

/** Salted hash of a submitter's IP. Stored instead of the address itself: it is
 *  enough to spot one person filing ten reviews, and it is not personal data we
 *  have any reason to keep in readable form. Salted with COOKIE_SECRET so the
 *  hashes aren't reversible by anyone who guesses at IP ranges. */
export const hashIp = (ip: string): string =>
  crypto.createHash("sha256").update(`${ip}|${config.cookieSecret}`).digest("hex").slice(0, 32);
