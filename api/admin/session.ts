/**
 * GET /api/admin/session — { authenticated } so the SPA can gate the console UI
 * without ever exposing the password or the session's contents to the browser.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_lib/admin.js";
import { methodNotAllowed } from "../_lib/http.js";

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== "GET") return methodNotAllowed(res, "GET");
  res.status(200).json({ authenticated: requireAdmin(req) });
}
