/**
 * POST /api/admin/login   body: { password }
 *
 * Verifies the shared owner password and mints an admin session cookie. Fail
 * closed (no ADMIN_PASSWORD ⇒ always 401), strict same-origin (unauthenticated
 * state-changing POST), and per-IP rate-limited against brute force.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAdminAuthConfigured, verifyPassword } from "../_lib/admin.js";
import { setAdminCookie } from "../_lib/cookies.js";
import { isStrictSameOrigin, methodNotAllowed } from "../_lib/http.js";
import { allow, clientIp } from "../_lib/ratelimit.js";

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  if (!isStrictSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  // Best-effort throttle (per warm instance): cap password guesses from one IP.
  if (!allow(`admin-login:${clientIp(req)}`, 5, 60_000)) {
    res.status(429).json({ ok: false, error: "rate_limited" });
    return;
  }
  // A misconfigured deploy 401s like a wrong password — no info leak to the
  // client — but leaves a breadcrumb in the function logs for whoever set it up.
  if (!isAdminAuthConfigured()) {
    console.warn("[admin/login] ADMIN_PASSWORD is not set — no login is possible.");
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (!verifyPassword(body.password)) {
    res.status(401).json({ ok: false, error: "invalid_password" });
    return;
  }
  setAdminCookie(res);
  res.status(200).json({ ok: true });
}
