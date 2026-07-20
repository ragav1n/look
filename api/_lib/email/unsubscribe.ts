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

const sign = (payload: string): string =>
  crypto.createHmac("sha256", config.cookieSecret).update(payload).digest("base64url");

const UNSUBSCRIBE_PATH = "/api/newsletter/unsubscribe";

export function unsubscribeUrl(email: string): string {
  const payload = Buffer.from(email.toLowerCase()).toString("base64url");
  return `${config.appOrigin}${UNSUBSCRIBE_PATH}?e=${payload}&t=${sign(payload)}`;
}

/** Recover the email from a signed link, or null if the signature doesn't hold. */
export function verifyUnsubscribe(payload: string, sig: string): string | null {
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length) return null;
  if (!crypto.timingSafeEqual(new Uint8Array(expected), new Uint8Array(given))) return null;
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
