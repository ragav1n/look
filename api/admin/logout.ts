/**
 * POST /api/admin/logout — clears the admin session cookie.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearAdminCookie } from "../_lib/cookies.js";
import { isSameOrigin, methodNotAllowed } from "../_lib/http.js";

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  clearAdminCookie(res);
  res.status(200).json({ ok: true });
}
