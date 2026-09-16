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
 * Writes arrive in later phases. When they do, the admin action gets its auth
 * preamble at the top of its own case, BEFORE any sub-operation is read, so a
 * new operation inherits the gate by construction rather than by remembering to
 * add a row to a table.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { firstQuery } from "./_lib/http.js";
import { isReviewsConfigured } from "./_lib/mongo.js";
import { getWall, listForProduct } from "./_lib/reviews.js";

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
