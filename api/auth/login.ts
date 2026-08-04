/**
 * GET /api/auth/login?redirect=/account/orders
 * Starts the OAuth flow: mints PKCE + state + nonce, stashes them (and where to
 * return the user) in a short-lived signed cookie, then 302s to Shopify's hosted
 * login. No token is ever created here.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearFreshLoginCookie, readFreshLogin, setTxCookie } from "../_lib/cookies.js";
import { safeRedirectPath } from "../_lib/http.js";
import { buildAuthorizeUrl, generatePkce, randomToken } from "../_lib/oauth.js";
import { assertConfig, resolveEndpoints } from "../_lib/shopify.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    assertConfig();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
    return;
  }

  const endpoints = await resolveEndpoints();
  const { verifier, challenge } = generatePkce();
  const state = randomToken(16);
  const nonce = randomToken(16);

  /* Straight off a logout, demand a real login instead of letting Shopify's
     surviving hosted session wave the shopper through — clicking "Sign in" and
     landing in the account without seeing the form is the bug this fixes. Only
     within the marker's few minutes, so an ordinary return visit still gets the
     convenience of SSO. */
  const forceLogin = readFreshLogin(req);
  if (forceLogin) clearFreshLoginCookie(res);

  setTxCookie(res, { verifier, state, nonce, redirect: safeRedirectPath(req.query.redirect) });
  res.redirect(302, buildAuthorizeUrl(endpoints, { state, nonce, challenge, forceLogin }));
}
