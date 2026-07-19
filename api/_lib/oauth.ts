/**
 * OAuth 2.0 Authorization Code + PKCE against Shopify's Customer Account API,
 * as a CONFIDENTIAL client: the token requests authenticate with the client
 * secret over HTTP Basic, so tokens are only ever minted server-side.
 */
import crypto from "node:crypto";
import { config, type Endpoints } from "./shopify.js";

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  /** epoch ms */
  expiresAt: number;
}

const b64url = (buf: Buffer) => buf.toString("base64url");
export const randomToken = (bytes = 32) => b64url(crypto.randomBytes(bytes));

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = randomToken(32);
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildAuthorizeUrl(
  endpoints: Endpoints,
  args: { state: string; nonce: string; challenge: string },
): string {
  const url = new URL(endpoints.authorize);
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", args.state);
  url.searchParams.set("nonce", args.nonce);
  url.searchParams.set("code_challenge", args.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

function basicAuth(): string {
  return "Basic " + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
}

interface RawToken {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

async function postToken(endpoints: Endpoints, body: URLSearchParams, priorRefresh?: string): Promise<TokenSet> {
  const res = await fetch(endpoints.token, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: basicAuth(),
    },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as RawToken;
  if (!res.ok || !json.access_token) {
    throw new Error(
      `Token endpoint ${res.status}: ${json.error ?? ""} ${json.error_description ?? ""}`.trim(),
    );
  }
  // Shopify does not always rotate the refresh token; keep the prior one if so.
  const refreshToken = json.refresh_token ?? priorRefresh ?? "";
  return {
    accessToken: json.access_token,
    refreshToken,
    idToken: json.id_token,
    // 60s skew so we refresh slightly early rather than mid-request.
    expiresAt: Date.now() + Math.max(0, (json.expires_in ?? 3600) - 60) * 1000,
  };
}

/** Exchange an authorization code (+ PKCE verifier) for tokens.
 *  Note: some store/version combinations require a follow-up
 *  urn:ietf:params:oauth:grant-type:token-exchange step to obtain the
 *  Customer-Account-API-scoped token; if the GraphQL endpoint 401s with a valid
 *  session, add that exchange here — it stays fully server-side. */
export function exchangeCode(endpoints: Endpoints, code: string, verifier: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code,
    code_verifier: verifier,
  });
  return postToken(endpoints, body);
}

export function refreshTokens(endpoints: Endpoints, refreshToken: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    refresh_token: refreshToken,
  });
  return postToken(endpoints, body, refreshToken);
}

export function buildLogoutUrl(endpoints: Endpoints, idToken?: string): string {
  const url = new URL(endpoints.logout);
  if (idToken) url.searchParams.set("id_token_hint", idToken);
  url.searchParams.set("post_logout_redirect_uri", config.appOrigin);
  return url.toString();
}
