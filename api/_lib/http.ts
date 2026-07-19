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

export const firstQuery = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

/** Only allow same-site path redirects — never an absolute URL, and never a
 *  protocol-relative `//host` that would smuggle an off-site destination. */
export function safeRedirectPath(v: string | string[] | undefined): string {
  const p = firstQuery(v);
  if (p.startsWith("/") && !p.startsWith("//")) return p;
  return "/account/profile";
}
