/**
 * Resolve a currently-valid customer access token for a request, refreshing
 * transparently when the stored one has expired. Tokens live only in HttpOnly
 * cookies; this is the single place handlers get one to call Shopify with.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  clearAuthCookies,
  readAccessExpiry,
  readAccessToken,
  readRefreshToken,
  setTokenCookies,
} from "./cookies.js";
import { refreshTokens } from "./oauth.js";
import { resolveEndpoints } from "./shopify.js";

/** Returns a usable access token, or null when the visitor isn't authenticated.
 *  May set refreshed cookies on `res` as a side effect. */
export async function getValidAccessToken(
  req: VercelRequest,
  res: VercelResponse,
): Promise<string | null> {
  const access = readAccessToken(req);
  const expiresAt = readAccessExpiry(req);
  if (access && Date.now() < expiresAt) return access;

  const refresh = readRefreshToken(req);
  if (!refresh) return null;

  try {
    const endpoints = await resolveEndpoints();
    const tokens = await refreshTokens(endpoints, refresh);
    setTokenCookies(res, tokens);
    return tokens.accessToken;
  } catch {
    // Refresh token is dead/revoked — clear the session so the SPA shows signed-out.
    clearAuthCookies(res);
    return null;
  }
}
