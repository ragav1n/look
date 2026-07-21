/**
 * /api/admin/session — the owner session as a single resource, so the console's
 * three tiny auth calls cost one Serverless Function instead of three (the Hobby
 * plan caps a deployment at 12):
 *
 *   GET    → { authenticated } so the SPA can gate the console UI without ever
 *            exposing the password or the session's contents to the browser.
 *   POST   → login. Verifies the shared owner password (body: { password }) and
 *            mints the admin session cookie. Fail closed (no ADMIN_PASSWORD ⇒
 *            always 401), strict same-origin (unauthenticated state-changing
 *            request), and per-IP rate-limited against brute force.
 *   DELETE → logout. Clears the admin session cookie.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAdminAuthConfigured, requireAdmin, verifyPassword } from "../_lib/admin.js";
import { clearAdminCookie, setAdminCookie } from "../_lib/cookies.js";
import { isSameOrigin, isStrictSameOrigin, methodNotAllowed } from "../_lib/http.js";
import { allow, clientIp } from "../_lib/ratelimit.js";

export default function handler(req: VercelRequest, res: VercelResponse): void {
  switch (req.method) {
    case "GET":
      res.status(200).json({ authenticated: requireAdmin(req) });
      return;
    case "POST":
      login(req, res);
      return;
    case "DELETE":
      logout(req, res);
      return;
    default:
      methodNotAllowed(res, "GET, POST, DELETE");
  }
}

function login(req: VercelRequest, res: VercelResponse): void {
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
    console.warn("[admin/session] ADMIN_PASSWORD is not set — no login is possible.");
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (!verifyPassword(body.password)) {
    res.status(401).json({ ok: false, error: "invalid_password" });
    return;
  }
  setAdminCookie(res);
  res.status(200).json({ ok: true });
}

function logout(req: VercelRequest, res: VercelResponse): void {
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  clearAdminCookie(res);
  res.status(200).json({ ok: true });
}
