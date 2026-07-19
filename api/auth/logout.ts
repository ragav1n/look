/**
 * POST /api/auth/logout
 * Clears the session cookies and returns Shopify's logout URL so the SPA can end
 * the hosted session too (and land back on the site origin).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearAuthCookies, readIdToken } from "../_lib/cookies.js";
import { isSameOrigin, methodNotAllowed } from "../_lib/http.js";
import { buildLogoutUrl } from "../_lib/oauth.js";
import { config, resolveEndpoints } from "../_lib/shopify.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const idToken = readIdToken(req);
  clearAuthCookies(res);

  let logoutUrl = config.appOrigin;
  try {
    const endpoints = await resolveEndpoints();
    logoutUrl = buildLogoutUrl(endpoints, idToken ?? undefined);
  } catch {
    /* fall back to just returning to the origin */
  }
  res.status(200).json({ logoutUrl });
}
