/**
 * POST /api/auth/logout
 * Clears the session cookies and returns Shopify's logout URL so the SPA can end
 * the hosted session too (and land back on the site origin).
 *
 * Ending the HOSTED session is the part that matters: our cookies going away
 * only signs the shopper out of this site. Shopify's own login session survives
 * independently, and while it lives, the next /api/auth/login gets SSO'd — the
 * shopper clicks "Sign in" and lands in their account without ever seeing the
 * form. The `look_fresh` marker below is the backstop for when that happens
 * anyway (see api/auth/login.ts).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearAuthCookies, readIdToken, setFreshLoginCookie } from "../_lib/cookies.js";
import { isSameOrigin, methodNotAllowed } from "../_lib/http.js";
import { buildLogoutUrl, idTokenExpiry } from "../_lib/oauth.js";
import { config, resolveEndpoints } from "../_lib/shopify.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const idToken = readIdToken(req);
  clearAuthCookies(res);
  setFreshLoginCookie(res);

  /* Shopify's logout endpoint REQUIRES a valid id_token_hint. Probed against the
     live store 2026-08-04: no hint → 400 {"error_description":"Invalid
     id_token."}, bad hint → 401. Neither ends the session, and neither redirects
     — the shopper is left staring at raw JSON on shopify.com. So we only send
     them there when we have a hint to send; with none, going straight home is
     strictly better (same surviving Shopify session, no dead end). */
  let logoutUrl = config.appOrigin;
  if (idToken) {
    /* Logged, deliberately not acted on. We never renew the id_token — Shopify's
       refresh responses don't carry one, so a long-lived session still holds the
       one minted at sign-in. Whether Shopify accepts an EXPIRED hint decides
       whether such a session can log out at all, and one real logout in the
       function logs answers it. Don't guess and skip: if expired hints are
       accepted, skipping would break the only working logout path. */
    const exp = idTokenExpiry(idToken);
    if (exp && exp < Date.now()) {
      console.warn(`[auth/logout] id_token_hint expired ${Math.round((Date.now() - exp) / 1000)}s ago`);
    }
    try {
      const endpoints = await resolveEndpoints();
      logoutUrl = buildLogoutUrl(endpoints, idToken);
    } catch {
      /* fall back to just returning to the origin */
    }
  } else {
    console.warn("[auth/logout] no id_token cookie — skipping Shopify logout");
  }
  res.status(200).json({ logoutUrl });
}
