/**
 * May this person review this garment?
 *
 * The client's rule is that only someone who actually ordered a piece may review
 * it. The obvious implementation — require a sign-in — would exclude most real
 * buyers: checked against the live store, `customerAccounts` is OPTIONAL,
 * `loginRequiredAtCheckout` is false, and every customer record is DISABLED.
 * People check out as guests here.
 *
 * So there are two accepted proofs, and a guest can satisfy the first:
 *
 *   1. A signed link emailed after delivery. The proof travels in the URL
 *      because it has to work from an inbox with no session and no cookie —
 *      the same reasoning as the unsubscribe links, and the same COOKIE_SECRET.
 *   2. A signed-in customer whose order history contains the product.
 *
 * Everyone else reads the reviews and is shown no form. Note the asymmetry that
 * matters: the browser asks `?action=eligibility` to decide whether to SHOW the
 * form, but `?action=submit` proves it again from scratch. The first answer is a
 * UI hint; only the second is a decision.
 *
 * Deliberately NOT a new case in cookies.ts's SigContext, even though the plan
 * sketched it that way: that union is for cookies, and a link that sits in an
 * inbox for weeks belongs with the other emailed link (email/unsubscribe.ts) as
 * a self-contained module with its own context tag. Same reasoning as
 * reviewPhoto.ts.
 */
import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { customerGraphql } from "./customer.js";
import { config } from "./shopify.js";
import { getValidAccessToken } from "./tokens.js";

/** Ninety days. Long, because someone may well come back to a review request
 *  weeks later, but not unbounded — a leaked link shouldn't work forever. */
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

const mac = (data: string): string =>
  crypto.createHmac("sha256", config.cookieSecret).update(`review|${data}`).digest("base64url");

export interface Invite {
  /** Shopify order GID, recorded on the review so a dispute can be traced. */
  orderId: string;
  productGid: string;
  email: string;
}

/** Mint the token that goes in a review-request email. */
export function signInvite(invite: Invite): string {
  const payload = Buffer.from(
    JSON.stringify({ o: invite.orderId, p: invite.productGid, e: invite.email, x: Date.now() + TTL_MS }),
  ).toString("base64url");
  return `${payload}.${mac(payload)}`;
}

/** The deep link a review-request email points at: the product page, with the
 *  proof attached, so the shopper lands on the piece they're reviewing. */
export function inviteUrl(invite: Invite, productHandle: string): string {
  return `${config.appOrigin}/shop/${productHandle}?review=${signInvite(invite)}`;
}

/** Recover an invite, or null if it's forged, malformed or expired. */
export function verifyInvite(token: unknown): Invite | null {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".", 2);
  if (!payload || !sig) return null;

  const expected = Buffer.from(mac(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length) return null;
  if (!crypto.timingSafeEqual(new Uint8Array(expected), new Uint8Array(given))) return null;

  try {
    const d = JSON.parse(Buffer.from(payload, "base64url").toString()) as Record<string, unknown>;
    if (typeof d.o !== "string" || typeof d.p !== "string" || typeof d.e !== "string") return null;
    if (typeof d.x !== "number" || d.x < Date.now()) return null;
    return { orderId: d.o, productGid: d.p, email: d.e };
  } catch {
    return null;
  }
}

/* The leanest question that answers "did they buy this": the customer's recent
   orders and the product ids on their line items. Deliberately not the app's own
   ORDERS_QUERY, which pulls images, prices and variant options to render cards. */
const PURCHASED_QUERY = /* GraphQL */ `
  query DidTheyBuyIt {
    customer {
      emailAddress { emailAddress }
      orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          lineItems(first: 50) { nodes { productId } }
        }
      }
    }
  }
`;

interface PurchasedResponse {
  data?: {
    customer?: {
      emailAddress?: { emailAddress?: string | null } | null;
      orders?: { nodes?: { id: string; lineItems?: { nodes?: { productId?: string | null }[] } }[] };
    } | null;
  };
}

export interface ReviewRight {
  may: boolean;
  /** Set when we know who they are, so the review can be tied to a person
   *  without asking them to retype an address we already have. NEVER served to
   *  the browser beyond the masked form in the admin. */
  email?: string;
  orderId?: string;
  /** True when the purchase is provable, which is what earns the badge. */
  verified: boolean;
  /** Why they may, for the UI to explain itself. */
  via?: "invite" | "account";
}

const NO: ReviewRight = { may: false, verified: false };

/**
 * Work out whether the caller may review `productGid`.
 *
 * Checks the cheap proof first: an invite token is a local HMAC check with no
 * network call, while the account path costs a Customer Account API round trip.
 */
export async function reviewRight(
  req: VercelRequest,
  /* Needed because a silently-refreshed access token has to be written back as a
     cookie — the same reason every other authenticated handler takes it. */
  res: VercelResponse,
  productGid: string,
  token: unknown,
): Promise<ReviewRight> {
  if (!productGid) return NO;

  const invite = verifyInvite(token);
  if (invite) {
    /* The token commits to a product. A valid token for a DIFFERENT piece must
       not unlock this one, or one delivery would license a review of anything. */
    if (invite.productGid !== productGid) return NO;
    return { may: true, email: invite.email, orderId: invite.orderId, verified: true, via: "invite" };
  }

  const access = await getValidAccessToken(req, res);
  if (!access) return NO;
  try {
    const gql = await customerGraphql(access, { query: PURCHASED_QUERY });
    const json = (await gql.json()) as PurchasedResponse;
    const customer = json.data?.customer;
    if (!customer) return NO;
    const order = customer.orders?.nodes?.find((o) =>
      o.lineItems?.nodes?.some((li) => li.productId === productGid),
    );
    if (!order) return NO;
    return {
      may: true,
      email: customer.emailAddress?.emailAddress ?? undefined,
      orderId: order.id,
      verified: true,
      via: "account",
    };
  } catch {
    /* A Customer Account API blip must not be readable as "yes". */
    return NO;
  }
}
