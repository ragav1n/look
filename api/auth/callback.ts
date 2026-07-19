/**
 * GET /api/auth/callback?code&state
 * Shopify redirects here after login. Verifies `state` (CSRF), exchanges the
 * code for tokens using the client secret, drops the tokens into HttpOnly
 * cookies, and 302s back into the SPA at the originally-requested path.
 *
 * The single-use auth code is consumed here on the server, so React StrictMode's
 * double effect invocation (which plagues client-side callbacks) is a non-issue.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearTxCookie, readTxCookie, setTokenCookies } from "../_lib/cookies.js";
import { firstQuery } from "../_lib/http.js";
import { exchangeCode } from "../_lib/oauth.js";
import { assertConfig, config, resolveEndpoints } from "../_lib/shopify.js";

function fail(res: VercelResponse, reason: string): void {
  res.redirect(302, `${config.appOrigin}/login?auth_error=${encodeURIComponent(reason)}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    assertConfig();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
    return;
  }

  const tx = readTxCookie(req);
  clearTxCookie(res); // single-use, whatever happens next

  const code = firstQuery(req.query.code);
  const state = firstQuery(req.query.state);

  if (firstQuery(req.query.error)) return fail(res, firstQuery(req.query.error));
  if (!tx || !code || !state || state !== tx.state) return fail(res, "invalid_state");

  try {
    const endpoints = await resolveEndpoints();
    const tokens = await exchangeCode(endpoints, code, tx.verifier);
    setTokenCookies(res, tokens);
    res.redirect(302, `${config.appOrigin}${tx.redirect}`);
  } catch {
    fail(res, "exchange_failed");
  }
}
