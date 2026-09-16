/**
 * /api/reviews — everything to do with customer reviews, as ONE Serverless
 * Function, multiplexed by `?action=`.
 *
 * Why one file rather than a file per action: Vercel's Hobby plan caps a
 * deployment at twelve functions, and this endpoint exists at all only because
 * api/auth/{session,logout} were merged to free a slot. So the shape is forced
 * — but it's also the right shape here, because one module then owns the schema,
 * the Shopify Files upload and the aggregate recompute together. The invariant
 * "approving a review recomputes that product's rating" can't drift across two
 * files if there's only one.
 *
 * NO rewrite is needed for this endpoint, unlike the merged ones. Vercel matches
 * the filesystem before it consults rewrites, so `api/reviews.ts` answers
 * /api/reviews directly and the SPA catch-all never sees it. The rewrites in
 * vercel.json exist to preserve URLs that were already in use before a merge;
 * a greenfield endpoint has no such legacy. (A dynamic `[action].ts` route would
 * NOT work — the catch-all shadows those. See api/admin/console.ts.)
 *
 * Actions, and who may call them:
 *   GET  ?action=wall                  public, cacheable
 *   GET  ?action=list&product=<gid>    public, cacheable
 *   GET  ?action=eligibility&product=<gid>[&token=]  per-session, never cached
 *   POST ?action=photo                 anyone who may review that piece
 *   POST ?action=submit                anyone who may review that piece
 *   POST ?action=admin                 OWNER — body.op selects the operation
 *
 * ONE action touches admin capability, and its auth preamble runs at the top of
 * that case BEFORE `body.op` is so much as read. Every operation — list, create,
 * approve, reject, feature, unfeature, reorder, resync, delete — is therefore
 * unreachable without passing it, and an operation added later inherits the gate
 * by construction. A per-action auth table would make a forgotten row a
 * privilege escalation instead of a 404.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin, verifyPassword } from "./_lib/admin.js";
import { deleteFiles, sniffImage, uploadImage } from "./_lib/files.js";
import { firstQuery, isSameOrigin, isStrictSameOrigin, methodNotAllowed } from "./_lib/http.js";
import { hashIp, isReviewsConfigured } from "./_lib/mongo.js";
import { allow, clientIp } from "./_lib/ratelimit.js";
import { reviewRight } from "./_lib/reviewAccess.js";
import {
  LIMITS,
  adminList,
  alreadyReviewed,
  deleteReview,
  featureReview,
  findReview,
  getWall,
  insertReview,
  listForProduct,
  productGidsWithReviews,
  readInput,
  recomputeAggregate,
  reorderWall,
  setStatus,
  unfeatureReview,
} from "./_lib/reviews.js";
import { signPhoto, verifyPhoto } from "./_lib/reviewPhoto.js";

/** Both public reads are cached at the edge. Without this the wall would hit
 *  Atlas on every single homepage view. The admin UI says "changes appear
 *  within a minute" for exactly this reason — otherwise she approves a review,
 *  refreshes, sees nothing, and reports a bug. */
const PUBLIC_CACHE = "public, s-maxage=60, stale-while-revalidate=300";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const action = firstQuery(req.query.action);

  switch (action) {
    case "wall":
      await readJson(res, () => getWall());
      return;
    case "list":
      await readJson(res, () => listForProduct(firstQuery(req.query.product)));
      return;
    case "eligibility":
      await eligibilityHandler(req, res);
      return;
    case "photo":
      await photoHandler(req, res);
      return;
    case "submit":
      await submitHandler(req, res);
      return;
    case "admin":
      await adminHandler(req, res);
      return;
    default:
      res.setHeader("Cache-Control", "no-store");
      res.status(404).json({ error: "not_found" });
  }
}

/**
 * Run a public read and answer with `{ reviews }`, degrading rather than failing.
 *
 * An empty list is always a valid answer here: the homepage wall backfills from
 * its fixtures and the PDP panel simply reads "Reviews (0)". So a missing
 * MONGODB_URI or an unreachable cluster must not 500 — that would break two
 * shopper-facing surfaces to report a problem only we can act on. The failure is
 * logged for us and left uncached, so recovery is immediate instead of waiting
 * out a minute of stale emptiness.
 */
async function readJson(
  res: VercelResponse,
  run: () => Promise<unknown[]>,
): Promise<void> {
  if (!isReviewsConfigured()) {
    /* Not an error: unsetting MONGODB_URI is the feature's deliberate kill
       switch. Cacheable, because nothing is going to change until a redeploy. */
    res.setHeader("Cache-Control", PUBLIC_CACHE);
    res.status(200).json({ reviews: [] });
    return;
  }
  try {
    const reviews = await run();
    res.setHeader("Cache-Control", PUBLIC_CACHE);
    res.status(200).json({ reviews });
  } catch (err) {
    console.error("[reviews] read failed:", err);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ reviews: [] });
  }
}

/** Shared preamble for both write actions. Returns true when the caller has
 *  passed every gate — method, same-origin, admin session — and has already been
 *  answered when it returns false. */
function gateOwner(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    methodNotAllowed(res, "POST");
    return false;
  }
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

/* A decoded 1200px JPEG at q0.78 lands around 150-220KB, so this is generous
   while still refusing anything that isn't a web-sized photo. The browser caps
   its own re-encode well below it, so a customer sees a friendly message rather
   than this. */
const MAX_IMAGE_BYTES = 1_200_000;

/**
 * POST ?action=photo — put one image into Shopify Files.
 *
 * Open to anyone who may review the piece they name, which in practice means
 * they are holding a signed link we emailed them or are signed in with that
 * order in their history. NOT open to any same-origin caller: five photo slots
 * per review would otherwise be a free, unauthenticated funnel into our Shopify
 * Files storage, and a rate limit alone only slows that down.
 *
 * Takes ONE image per request as base64 in JSON, not multipart. That keeps the
 * local dev server's JSON-only body reader untouched, so the whole flow is
 * runnable locally, and one image per request keeps the payload far below
 * Vercel's 4.5MB body cap even with base64's ~33% inflation.
 *
 * Returns a signed token as well as the url. `submit` will trust only what it
 * can recover from inside that token — see _lib/reviewPhoto.ts.
 */
async function photoHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  if (!isStrictSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  /* Five photos per review means a burst is normal; twelve a minute fits a
     submission comfortably and still refuses a script. */
  if (!allow(`photo:${clientIp(req)}`, 12, 60_000)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;

  /* The owner uploads from the console, where there is no invite token; every
     other caller has to prove they may review the piece they name. */
  if (!requireAdmin(req)) {
    const right = await reviewRight(req, res, str(body.productGid), body.token);
    if (!right.may) {
      res.status(403).json({ error: "not_eligible" });
      return;
    }
  }

  const raw = typeof body.image === "string" ? body.image : "";
  const base64 = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw;
  if (!base64) {
    res.status(400).json({ error: "no_image" });
    return;
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64, "base64");
  } catch {
    res.status(400).json({ error: "bad_image" });
    return;
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    res.status(413).json({ error: "image_too_large" });
    return;
  }

  /* The declared MIME is whatever the caller says it is, so read the actual
     bytes instead. A PDF renamed .jpg gets refused here, not by Shopify. */
  const kind = sniffImage(bytes);
  if (!kind) {
    res.status(400).json({ error: "not_an_image" });
    return;
  }

  try {
    const file = await uploadImage(bytes, `review-${Date.now()}.${kind.ext}`, kind.mime);
    if (!file.url) {
      /* Shopify is still processing. The GID is enough to find it again, and the
         moderation screen resolves a pending url lazily. */
      res.status(202).json({ gid: file.gid, url: null });
      return;
    }
    res.status(200).json({ ...file, token: signPhoto({ gid: file.gid, url: file.url }) });
  } catch (err) {
    console.error("[reviews] photo upload failed:", err);
    res.status(502).json({ error: "upload_failed" });
  }
}

/**
 * POST ?action=admin — every moderation operation, selected by `body.op`.
 *
 * The gate above runs first and unconditionally. `delete` additionally re-checks
 * the password, the same step-up a campaign send uses: it is the one operation
 * here that destroys a customer's words irrecoverably.
 */
async function adminHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!gateOwner(req, res)) return;

  if (!isReviewsConfigured()) {
    res.status(503).json({ error: "reviews_not_configured" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const op = typeof body.op === "string" ? body.op : "";
  const id = typeof body.id === "string" ? body.id : "";

  try {
    switch (op) {
      case "list": {
        res.status(200).json({ reviews: await adminList() });
        return;
      }

      case "create": {
        /* Her own entries, typed up from Instagram or WhatsApp. Approved on
           arrival and marked verified — she is vouching for them, and she picked
           the garment herself, so there is nothing to moderate. */
        const input = readInput(body);
        if ("error" in input) {
          res.status(400).json({ error: input.error });
          return;
        }
        const attached = readPhotos(body.photoTokens);
        if ("error" in attached) {
          res.status(400).json({ error: attached.error });
          return;
        }
        const newId = await insertReview(
          { ...input, photos: attached.photos, verified: body.verified !== false },
          "approved",
          "owner",
        );
        await recomputeAggregate(input.productGid);
        res.status(200).json({ ok: true, id: newId });
        return;
      }

      case "approve":
      case "reject": {
        const doc = await findReview(id);
        if (!doc) {
          res.status(404).json({ error: "not_found" });
          return;
        }
        await setStatus(id, op === "approve" ? "approved" : "rejected");
        await recomputeAggregate(doc.productGid);
        res.status(200).json({ ok: true });
        return;
      }

      case "feature": {
        const ok = await featureReview(id);
        res.status(ok ? 200 : 409).json(ok ? { ok: true } : { error: "wall_full" });
        return;
      }

      case "unfeature": {
        await unfeatureReview(id);
        res.status(200).json({ ok: true });
        return;
      }

      case "reorder": {
        await reorderWall(body.ids);
        res.status(200).json({ ok: true });
        return;
      }

      case "delete": {
        /* Step-up, like a campaign send: a session alone should not be able to
           destroy a customer's words. */
        if (!verifyPassword(body.password)) {
          res.status(401).json({ error: "password_required" });
          return;
        }
        const doc = await deleteReview(id);
        if (!doc) {
          res.status(404).json({ error: "not_found" });
          return;
        }
        await deleteFiles(doc.photoGids ?? []);
        await recomputeAggregate(doc.productGid);
        res.status(200).json({ ok: true });
        return;
      }

      case "resync": {
        /* The repair tool. The aggregate write is best-effort by design, so a
           Shopify hiccup during moderation leaves a product's stars stale; this
           recomputes every product that has a review, and is the answer to
           "the rating looks wrong" without anyone touching the database. */
        const gids = await productGidsWithReviews();
        for (const gid of gids) await recomputeAggregate(gid);
        res.status(200).json({ ok: true, products: gids.length });
        return;
      }

      default:
        res.status(400).json({ error: "unknown_op" });
    }
  } catch (err) {
    console.error(`[reviews] admin op ${op || "(none)"} failed:`, err);
    res.status(500).json({ error: "server_error" });
  }
}


/**
 * Recover the photos a submission claims, or say which one didn't hold up.
 *
 * Rejects rather than silently dropping. Both are SAFE — a url that isn't inside
 * a signature is never stored either way — but silence would mean someone whose
 * upload token has aged past its hour watches their photo quietly vanish from a
 * review they just filed, with nothing to tell them why.
 */
function readPhotos(raw: unknown): { error: string } | { photos: { gid: string; url: string }[] } {
  if (!Array.isArray(raw) || raw.length === 0) return { photos: [] };
  if (raw.length > LIMITS.photos) return { error: "too_many_photos" };
  const photos = [];
  for (const token of raw) {
    const ref = verifyPhoto(token);
    if (!ref) return { error: "bad_photo" };
    photos.push(ref);
  }
  return { photos };
}

/** Read a trimmed string field off an untrusted body. */
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * GET ?action=eligibility&product=<gid>[&token=…]
 *
 * Answers the one question the product page needs before it can decide whether
 * to offer a "write a review" button. NEVER cached — the answer is per person,
 * and an edge cache would hand one shopper's eligibility to the next visitor.
 *
 * This is a UI hint and nothing more. `submit` proves the same thing again from
 * scratch, so a forged "yes" here buys an attacker a form and no more.
 */
async function eligibilityHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  const right = await reviewRight(req, res, firstQuery(req.query.product), firstQuery(req.query.token));
  res.status(200).json({
    may: right.may,
    via: right.via,
    /* Their OWN address, arriving from their own emailed link or their own
       session, returned only so the form can prefill it. */
    email: right.email,
  });
}

/**
 * POST ?action=submit — a shopper files a review.
 *
 * The full anti-abuse stack, in the order that costs least: a strict same-origin
 * check (a real browser always sends Origin on a same-origin POST), the same
 * `contact_reason` honeypot the newsletter form uses, a rate limit, and only
 * then the network call that proves purchase.
 *
 * Arrives PENDING. Nothing a stranger writes reaches the site without the owner
 * approving it, which is also why there is no aggregate recompute here.
 */
async function submitHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  if (!isStrictSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;

  /* Honeypot: a hidden field with a name the browser won't autofill. Populated
     means a bot. Answer 200 and write nothing — telling a bot it was caught only
     helps it try again differently. */
  if (str(body.contact_reason)) {
    res.status(200).json({ ok: true, status: "pending" });
    return;
  }

  if (!allow(`review:${clientIp(req)}`, 5, 60_000)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  if (!isReviewsConfigured()) {
    res.status(503).json({ error: "reviews_not_configured" });
    return;
  }

  const input = readInput(body);
  if ("error" in input) {
    res.status(400).json({ error: input.error });
    return;
  }

  /* Proved here from scratch, never taken from the eligibility response. */
  const right = await reviewRight(req, res, input.productGid, body.token);
  if (!right.may) {
    res.status(403).json({ error: "not_eligible" });
    return;
  }

  try {
    const email = (right.email ?? "").toLowerCase();
    if (email && (await alreadyReviewed(email, input.productGid))) {
      res.status(409).json({ error: "already_reviewed" });
      return;
    }

    const attached = readPhotos(body.photoTokens);
    if ("error" in attached) {
      res.status(400).json({ error: attached.error });
      return;
    }

    await insertReview(
      {
        ...input,
        photos: attached.photos,
        /* Earned by the proof, not claimed in the form. */
        verified: right.verified,
        email: email || undefined,
        ipHash: hashIp(clientIp(req)),
        userAgent: str(req.headers["user-agent"]).slice(0, 200) || undefined,
      },
      "pending",
      "customer",
    );
    res.status(200).json({ ok: true, status: "pending" });
  } catch (err) {
    console.error("[reviews] submit failed:", err);
    res.status(500).json({ error: "server_error" });
  }
}
