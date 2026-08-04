/**
 * POST /api/webhooks/delhivery
 * Delhivery's status-push endpoint. Every parcel scan Delhivery sends becomes a
 * Shopify *fulfillment event*, which is the only thing that moves the customer-
 * facing `latestShipmentStatus` our order tracker reads. Without this bridge the
 * tracker can never pass "Shipped" — manually toggling an order in the admin
 * doesn't write the event the tracker looks at.
 *
 * Auth: a shared secret in DELHIVERY_WEBHOOK_SECRET, accepted as `?token=`, an
 * `X-Webhook-Token` header, or `Authorization: Bearer …` — whichever Delhivery's
 * push config supports. Fail-closed: no secret configured ⇒ every call is
 * rejected, exactly like CRON_SECRET. This endpoint is called by Delhivery's
 * servers, NOT the browser, so it deliberately has no same-origin guard.
 *
 * `?dry=1` runs the full pipeline — auth, parse, map, match — but writes NO
 * event, so a scan can be replayed safely against production to see where it
 * would land. Use it (with a signed test body) to confirm order #1001 flips
 * before Delhivery is live. See docs/delhivery.md.
 *
 * The response is always a per-scan report, and a well-formed authenticated call
 * is acknowledged 200 even when a scan doesn't match (retrying won't help). Only
 * a total upstream failure returns 502, so Delhivery retries the batch.
 */
import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { firstQuery } from "../_lib/http.js";
import { isAdminConfigured } from "../_lib/shopify.js";
import {
  locationCity,
  mapToShopifyStatus,
  parseScan,
  shipmentsOf,
  toIso,
} from "../_lib/delhivery.js";
import { createFulfillmentEvent, findFulfillmentForShipment } from "../_lib/fulfillment.js";

/** Constant-time compare of the presented secret against DELHIVERY_WEBHOOK_SECRET.
 *  Fail closed: an unset secret rejects everything. */
function authorized(req: VercelRequest): boolean {
  const expected = process.env.DELHIVERY_WEBHOOK_SECRET?.trim();
  if (!expected) return false;

  const header = req.headers["x-webhook-token"];
  const bearer = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const presented =
    firstQuery(req.query.token) || (Array.isArray(header) ? header[0] : header) || bearer || "";

  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
}

/** Outcome of one scan, for the response body + logs. */
type Outcome =
  | { result: "written"; order: string; status: string }
  | { result: "would_write"; order: string; status: string } // dry run
  | { result: "duplicate"; order: string; status: string }
  | { result: "unmapped"; status: string }
  | { result: "unmatched"; ref: string; awb: string }
  | { result: "rejected"; message: string }
  | { result: "error" };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  if (!authorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  if (!isAdminConfigured()) {
    res.status(500).json({ error: "admin_not_configured" });
    return;
  }

  const dry = firstQuery(req.query.dry) === "1";
  const shipments = shipmentsOf(req.body);
  if (shipments.length === 0) {
    res.status(400).json({ error: "no_shipment", hint: "expected { Shipment: {…} } push body" });
    return;
  }

  const outcomes: Outcome[] = [];
  let upstreamErrors = 0;

  for (const raw of shipments) {
    const scan = parseScan(raw);
    if (!scan) {
      outcomes.push({ result: "rejected", message: "missing AWB/ReferenceNo or Status" });
      continue;
    }

    const status = mapToShopifyStatus(scan);
    if (!status) {
      // Parcel moved, but not in a way the tracker shows (e.g. a return leg).
      outcomes.push({ result: "unmapped", status: scan.status });
      continue;
    }

    try {
      const match = await findFulfillmentForShipment({ referenceNo: scan.referenceNo, awb: scan.awb });
      if (!match) {
        outcomes.push({ result: "unmatched", ref: scan.referenceNo, awb: scan.awb });
        continue;
      }

      // Cheap idempotency: Delhivery re-sends scans, so skip when the fulfilment's
      // newest event already carries this exact status.
      if (match.latestEventStatus === status) {
        outcomes.push({ result: "duplicate", order: match.orderName, status });
        continue;
      }

      if (dry) {
        outcomes.push({ result: "would_write", order: match.orderName, status });
        continue;
      }

      const written = await createFulfillmentEvent({
        fulfillmentId: match.fulfillmentId,
        status,
        happenedAt: toIso(scan.statusDateTime),
        message: scan.instructions || scan.status,
        city: locationCity(scan.location),
      });
      if (!written.ok) {
        console.error("[webhooks/delhivery] event rejected", match.orderName, status, written.userErrors);
        outcomes.push({ result: "rejected", message: written.userErrors.map((e) => e.message).join("; ") || "userError" });
        continue;
      }
      outcomes.push({ result: "written", order: match.orderName, status });
    } catch (err) {
      upstreamErrors += 1;
      console.error("[webhooks/delhivery] upstream error for", scan.referenceNo || scan.awb, err);
      outcomes.push({ result: "error" });
    }
  }

  // Retry the whole batch only if EVERY scan hit an upstream error (transient) —
  // a partial success must be acknowledged so Delhivery doesn't replay the ones
  // that already landed.
  const allFailed = upstreamErrors > 0 && upstreamErrors === shipments.length;
  res.status(allFailed ? 502 : 200).json({ ok: !allFailed, dry, outcomes });
}
