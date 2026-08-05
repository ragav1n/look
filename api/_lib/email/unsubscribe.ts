/**
 * Signed unsubscribe links.
 *
 * The link has to work from an inbox, with no session and no cookie, so the
 * address travels in the URL. It is HMAC-signed with the same COOKIE_SECRET the
 * OAuth transient cookie uses, so nobody can hand-craft a URL that unsubscribes
 * someone else's address.
 */
import crypto from "node:crypto";
import { config } from "../shopify.js";

const mac = (data: string): string =>
  crypto.createHmac("sha256", config.cookieSecret).update(data).digest("base64url");

/** Signed for this purpose only, so an unsubscribe token can never be replayed
 *  as one of the cookies that shares COOKIE_SECRET (see _lib/cookies.ts). */
const sign = (payload: string): string => mac(`unsub|${payload}`);

/** The format used before the context tag existed. Still ACCEPTED on the way in,
 *  never minted on the way out: these links sit in inboxes indefinitely, and a
 *  one-click unsubscribe that silently stops working is a compliance failure,
 *  not a cosmetic one. Safe to delete once the old campaigns have aged out.
 *
 *  Accepting it costs nothing: a token only unsubscribes the address it encodes,
 *  and neither cookie payload is a bare base64url email address. */
const legacySign = (payload: string): string => mac(payload);

const UNSUBSCRIBE_PATH = "/api/newsletter/unsubscribe";

export function unsubscribeUrl(email: string): string {
  const payload = Buffer.from(email.toLowerCase()).toString("base64url");
  return `${config.appOrigin}${UNSUBSCRIBE_PATH}?e=${payload}&t=${sign(payload)}`;
}

const matches = (expected: string, given: string): boolean => {
  const a = new Uint8Array(Buffer.from(expected));
  const b = new Uint8Array(Buffer.from(given));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/** Recover the email from a signed link, or null if the signature doesn't hold.
 *  Both the current and the pre-tag signature are accepted — see `legacySign`. */
export function verifyUnsubscribe(payload: string, sig: string): string | null {
  if (!payload || !sig) return null;
  if (!matches(sign(payload), sig) && !matches(legacySign(payload), sig)) return null;
  try {
    return Buffer.from(payload, "base64url").toString() || null;
  } catch {
    return null;
  }
}

/**
 * Headers that make Gmail/Yahoo show their own one-click unsubscribe control.
 * Required of bulk senders since 2024, and a missing one hurts deliverability
 * more than it hurts the recipient. `List-Unsubscribe-Post` commits us to
 * honouring a bare POST to the same URL — the endpoint handles both verbs.
 */
export function listUnsubscribeHeaders(url: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
