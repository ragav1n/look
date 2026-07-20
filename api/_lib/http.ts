/** Small HTTP helpers shared by the BFF handlers. */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { config } from "./shopify.js";

export function methodNotAllowed(res: VercelResponse, allow: string): void {
  res.setHeader("Allow", allow);
  res.status(405).json({ error: "method_not_allowed" });
}

/** CSRF guard for state-changing POSTs. SameSite=Lax already blocks cross-site
 *  cookie-bearing requests; this rejects any that do carry a foreign Origin. */
export function isSameOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin requests may omit Origin; Lax covers us
  return origin === config.appOrigin;
}

/** Strict same-origin guard for UNauthenticated state-changing POSTs (newsletter
 *  subscribe) that have no session cookie for Lax to protect. Unlike isSameOrigin
 *  a MISSING Origin is rejected — a real browser always sends Origin on a
 *  same-origin fetch/XHR POST, so only non-browser callers (curl, scripts) omit
 *  it. Falls back to Referer for the rare privacy setup that strips Origin.
 *  NOTE: an attacker can forge these headers from a script; this stops naive
 *  abuse and browser CSRF, not a determined scripted attacker. */
export function isStrictSameOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin;
  if (origin) return origin === config.appOrigin;
  const referer = req.headers.referer;
  if (referer) {
    try {
      return new URL(referer).origin === config.appOrigin;
    } catch {
      return false;
    }
  }
  return false;
}

export const firstQuery = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

/** Mask an email for logs — keep the first local-part char + the full domain,
 *  so `john@example.com` logs as `j***@example.com`. Keeps function logs useful
 *  for debugging without spilling recipient PII in plaintext. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

/** Only allow same-site path redirects — never an absolute URL, and never a
 *  protocol-relative `//host` that would smuggle an off-site destination. */
export function safeRedirectPath(v: string | string[] | undefined): string {
  const p = firstQuery(v);
  if (p.startsWith("/") && !p.startsWith("//")) return p;
  return "/account/profile";
}
