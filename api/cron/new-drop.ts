/**
 * GET /api/cron/new-drop
 * Daily digest of newly published products, sent to every marketing subscriber.
 * Wired as a Vercel cron in vercel.json (05:00 UTC = 10:30 IST).
 *
 * Flow: find products published in the last 30 days that aren't yet tagged
 * `drop-announced` → if none, stop → email the subscriber list in batches →
 * tag the announced products, but ONLY after a successful send, so a failure
 * retries tomorrow instead of losing the drop.
 *
 * Auth: Vercel automatically sends `Authorization: Bearer $CRON_SECRET` on cron
 * invocations when the var is set. We reject anything else, so the endpoint
 * can't be triggered by the public. `?dry=1` renders and counts without sending
 * or tagging — use it for every manual test.
 *
 * Idempotency comes from the tag, not from timing: Hobby crons can fire anywhere
 * within the scheduled hour and occasionally more than once, and a daily digest
 * absorbs that — the second run finds everything already tagged and sends zero.
 */
import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listSubscribers } from "../_lib/audience.js";
import { composeEmail } from "../_lib/email/compose.js";
import { sendBatch } from "../_lib/email/send.js";
import { type EmailProduct, MAX_PRODUCTS } from "../_lib/email/render.js";
import { type DropProduct, getUnannouncedDrops, markAnnounced } from "../_lib/drops.js";
import { firstQuery } from "../_lib/http.js";
import { isAdminConfigured } from "../_lib/shopify.js";

const SHOP_URL = "https://look.ind.in";

/** Mirror of src/lib/format.ts — the Figma design prefixes INR with "Rs.". The
 *  BFF can't import from src/, so this is a deliberate small duplicate. */
function priceLabel(amount: number, currency: string): string {
  if (amount <= 0) return ""; // ₹0 placeholder prices shouldn't show a figure
  const value =
    currency === "INR"
      ? `Rs. ${Math.round(amount).toLocaleString("en-IN")}`
      : new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  return `from ${value}`; // "from" because prices differ per size on this store
}

const toEmailProduct = (p: DropProduct): EmailProduct => ({
  title: p.title,
  url: `${SHOP_URL}/shop/${p.handle}`,
  imageUrl: p.imageUrl,
  priceLabel: priceLabel(p.minPrice, p.currencyCode),
});

function authorized(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  // Fail closed: with no secret configured we REFUSE, rather than expose a
  // list-wide email blast to any anonymous GET. Vercel injects this as the
  // cron's Bearer automatically once the var is set; local dry-runs must send
  // it too (it's already in .env). Compared in constant time.
  if (!secret) return false;
  const given = Buffer.from(req.headers.authorization ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return (
    given.length === expected.length &&
    crypto.timingSafeEqual(new Uint8Array(given), new Uint8Array(expected))
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  if (!authorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  if (!isAdminConfigured()) {
    res.status(500).json({ ok: false, error: "admin_not_configured" });
    return;
  }

  const dry = firstQuery(req.query.dry) === "1";

  try {
    // Fetch up to the email's ceiling and show every one — a collection launch
    // arrives as one email instead of losing pieces past the old teaser cap.
    const drops = await getUnannouncedDrops(MAX_PRODUCTS);
    if (!drops.length) {
      res.status(200).json({ ok: true, drops: 0, sent: 0, message: "no new drops" });
      return;
    }

    const featured = drops.map(toEmailProduct);
    const subscribers = await listSubscribers();

    if (dry) {
      // Render one sample against the first subscriber (or a placeholder) so the
      // HTML — including a real per-recipient unsubscribe link — is inspectable.
      const sampleTo = subscribers[0]?.email ?? "preview@look.ind.in";
      const sample = await composeEmail("drop", sampleTo, { products: featured });
      res
        .status(200)
        .setHeader("Content-Type", "text/html; charset=utf-8")
        .send(
          `<!-- dry run: ${drops.length} drop(s), ${subscribers.length} subscriber(s), nothing sent or tagged -->\n${sample.html}`,
        );
      return;
    }

    // One compose per recipient — each carries its own signed unsubscribe link.
    const emails = await Promise.all(
      subscribers.map((s) => composeEmail("drop", s.email, { products: featured })),
    );
    const result = await sendBatch(emails);

    /* Tag exactly the products we showed (drops === featured now), once at least
       one email genuinely went out.
       - `!simulated`: a "simulated" send (admin configured but no RESEND key, as
         on a preview deploy) logs instead of sending. Tagging then would burn
         the drop — the products would read as announced and never actually mail
         once a key is added. So never tag a simulated run.
       - `sent > 0` rather than `failed === 0`: a handful of permanently-bad
         addresses must not block tagging, or the whole list gets re-mailed the
         same drop every single day. A total failure (sent === 0) still leaves
         everything un-tagged to retry tomorrow. */
    let tagged = 0;
    if (!result.simulated && result.sent > 0) {
      tagged = await markAnnounced(drops.map((d) => d.id));
    }

    res.status(200).json({
      ok: true,
      drops: drops.length,
      recipients: subscribers.length,
      sent: result.sent,
      failed: result.failed,
      simulated: result.simulated,
      tagged,
    });
  } catch (err) {
    console.error("[cron/new-drop] failed:", err);
    res.status(502).json({ ok: false, error: "drop_failed" });
  }
}
