/**
 * Asking a customer to review what they bought.
 *
 * This is the part that actually produces reviews. Nobody visits a product page
 * unprompted to write one, and since guests can check out here without an
 * account, the emailed link is also the ONLY way most real buyers can prove they
 * bought the piece at all (see reviewAccess.ts). It is, in short, the thing the
 * paid reviews apps were charging for.
 *
 * Runs off the existing daily cron rather than its own: the Hobby plan caps us
 * at twelve functions and one cron, and a daily sweep is the right cadence for
 * something that fires a few days after delivery anyway. When the Delhivery
 * webhook is fully live it could move there and fire on the Delivered scan
 * itself, which would be tighter — but the sweep is what works today and is
 * resilient to a missed webhook.
 */
import { requestsCollection } from "./mongo.js";
import { sendLifecycleEmail } from "./email/compose.js";
import { esc } from "./email/render.js";
import { sendEmail } from "./email/send.js";
import { inviteUrl } from "./reviewAccess.js";
import { adminGraphql, config, isAdminConfigured } from "./shopify.js";

/** Wait this long after delivery before asking. Long enough that they've
 *  actually worn it, short enough that they still remember ordering it. */
const DELAY_DAYS = 3;
/** Don't chase orders older than this — a review request for something bought
 *  four months ago reads as spam, and the invite token expires at 90 days. */
const WINDOW_DAYS = 45;

const DELIVERED_ORDERS = /* GraphQL */ `
  query DeliveredOrders($query: String!) {
    orders(first: 50, query: $query, sortKey: PROCESSED_AT, reverse: true) {
      nodes {
        id
        name
        email
        processedAt
        fulfillments(first: 10) {
          displayStatus
          deliveredAt
        }
        lineItems(first: 50) {
          nodes {
            product {
              id
              handle
              title
              featuredImage { url }
            }
          }
        }
      }
    }
  }
`;

interface RawProduct {
  id: string;
  handle: string;
  title: string;
  featuredImage?: { url?: string | null } | null;
}

interface RawOrder {
  id: string;
  name: string;
  email?: string | null;
  processedAt: string;
  fulfillments?: { displayStatus?: string | null; deliveredAt?: string | null }[];
  lineItems?: { nodes?: { product?: RawProduct | null }[] };
}

export interface RequestSweep {
  /** Orders that came back delivered inside the window. */
  orders: number;
  /** (order, product) pairs that had never been asked about. */
  candidates: number;
  sent: number;
  failed: number;
  /** True when nothing was actually emailed. */
  dry: boolean;
}

/**
 * Find delivered orders and ask about anything not already asked about.
 *
 * Marks BEFORE sending would risk silently skipping a genuine request; marking
 * after a failed send would risk asking twice. We mark after a SUCCESSFUL send
 * only, which errs towards asking again tomorrow — the friendlier failure.
 */
export async function sweepReviewRequests(
  opts: { dry?: boolean } = {},
): Promise<RequestSweep> {
  const dry = opts.dry === true;
  const out: RequestSweep = { orders: 0, candidates: 0, sent: 0, failed: 0, dry };
  if (!isAdminConfigured()) return out;

  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  const res = await adminGraphql(DELIVERED_ORDERS, {
    query: `fulfillment_status:fulfilled AND processed_at:>=${since}`,
  });
  const json = (await res.json()) as {
    data?: { orders?: { nodes?: RawOrder[] } };
    errors?: { message: string }[];
  };
  if (json.errors?.length) {
    console.error("[reviews] order sweep:", json.errors.map((e) => e.message).join("; "));
    return out;
  }

  const cutoff = Date.now() - DELAY_DAYS * 86_400_000;
  const col = await requestsCollection();

  for (const order of json.data?.orders?.nodes ?? []) {
    /* "Fulfilled" is not "delivered". Only a Delivered fulfillment means the
       garment is actually in their hands, which is the only point at which
       asking how it fits makes any sense. */
    const delivered = order.fulfillments?.find((f) => f.displayStatus === "DELIVERED");
    if (!delivered) continue;
    /* deliveredAt can be null on a fulfillment marked delivered by hand in the
       admin; fall back to when the order was placed, which is necessarily
       earlier and so only ever delays the ask. */
    const when = Date.parse(delivered.deliveredAt ?? order.processedAt);
    if (!Number.isFinite(when) || when > cutoff) continue;
    const email = order.email?.trim();
    if (!email) continue;
    out.orders++;

    /* One email per PIECE, not per order: the review is filed against a garment,
       and a two-piece order deserves two links. De-duplicated because a customer
       can legitimately buy two sizes of the same thing. */
    const products = new Map<string, RawProduct>();
    for (const li of order.lineItems?.nodes ?? []) {
      if (li.product?.id) products.set(li.product.id, li.product);
    }

    for (const product of products.values()) {
      const key = `${order.id}|${product.id}`;
      if (await col.findOne({ _id: key }, { projection: { _id: 1 } })) continue;
      out.candidates++;
      if (dry) continue;

      const url = inviteUrl(
        { orderId: order.id, productGid: product.id, email },
        product.handle,
      );
      const ok = await sendLifecycleEmail("review_request", email, {
        ctaUrl: url,
        products: [
          {
            title: product.title,
            url,
            imageUrl: product.featuredImage?.url ?? undefined,
          },
        ],
      });
      if (!ok) {
        out.failed++;
        continue;
      }
      /* Only now. A failed send stays unmarked and is retried tomorrow. */
      await col.insertOne({
        _id: key,
        orderId: order.id,
        productGid: product.id,
        email,
        sentAt: new Date(),
      });
      out.sent++;
    }
  }

  return out;
}

/* --- Telling the owner something is waiting -------------------------------- */

/**
 * Where the "a review is waiting" note goes. Falls back to the support inbox,
 * which already exists and already forwards to her. Set OWNER_EMAIL to send it
 * somewhere else.
 */
const ownerInbox = (): string =>
  process.env.OWNER_EMAIL?.trim() || process.env.EMAIL_REPLY_TO?.trim() || "support@look.ind.in";

/**
 * Tell the owner a review is waiting on her.
 *
 * Deliberately plain rather than going through renderEmail: that template is
 * brand communication and every message it builds carries an unsubscribe link
 * and List-Unsubscribe headers, which are exactly wrong here. This is an
 * internal alert to one address, and she must not be able to unsubscribe herself
 * from being told her shop needs attention.
 *
 * Best-effort, like every other lifecycle send: a review that saved but didn't
 * get announced is a much smaller problem than a submission that failed.
 */
export async function notifyOwnerOfReview(review: {
  author: string;
  rating: number;
  title: string;
  body: string;
  productName?: string;
}): Promise<void> {
  const piece = review.productName ?? "one of your pieces";
  const console_ = `${config.appOrigin}/admin`;
  const text = [
    `${review.author} left a ${review.rating}-star review of ${piece}.`,
    "",
    `"${review.title}"`,
    review.body,
    "",
    `It's waiting for you to approve it: ${console_}`,
    "Nobody can see it until you do.",
  ].join("\n");

  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:#222">
  <p>${esc(review.author)} left a ${esc(String(review.rating))}-star review of <strong>${esc(piece)}</strong>.</p>
  <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #d21f3c;background:#faf8f6">
    <strong>${esc(review.title)}</strong><br>${esc(review.body)}
  </blockquote>
  <p><a href="${esc(console_)}/">Open the console to approve it</a>. Nobody can see it until you do.</p>
</div>`;

  try {
    await sendEmail({
      to: ownerInbox(),
      subject: `New review waiting — ${piece}`,
      html,
      text,
    });
  } catch (err) {
    console.error("[reviews] owner notification failed:", err);
  }
}
