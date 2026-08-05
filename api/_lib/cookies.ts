/**
 * Cookie helpers for the auth BFF. All auth cookies are HttpOnly so page
 * JavaScript (and any XSS) can never read the tokens — that is the whole point
 * of running auth through a backend instead of the browser.
 *
 * Scoping: token cookies use Path=/api so they ride only to our own functions,
 * never to the SPA/static requests. SameSite=Lax is required so the transient
 * cookie survives the top-level redirect back from Shopify's hosted login.
 */
import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { config } from "./shopify.js";

export const COOKIE = {
  tx: "look_tx", // transient: PKCE verifier + state + nonce + post-login redirect
  access: "look_at",
  accessExp: "look_at_exp",
  refresh: "look_rt",
  idToken: "look_idt",
  admin: "look_admin", // campaign-console owner session (see _lib/admin.ts)
  fresh: "look_fresh", // "you just logged out" — makes the next login prompt
} as const;

const API_PATH = "/api";
/** 30 min, NOT the "a redirect takes seconds" figure this used to be. Login is
 *  passwordless: the shopper leaves for their inbox, hunts a 6-digit code out of
 *  Promotions or Spam, and comes back. When this cookie expires first, the
 *  callback finds no `state` and fails the sign-in with `invalid_state` — which
 *  reads to the shopper as "we couldn't sign you in" for no visible reason. */
const TX_MAX_AGE = 1800;
/** Long enough to cover the trip out to Shopify's logout and back, short enough
 *  that it can't still be sitting there on a genuinely new sign-in later. */
const FRESH_MAX_AGE = 300;
/** Admin console session lifetime. Kept short because a stateless signed cookie
 *  can't be revoked individually — to force logout everywhere, rotate
 *  COOKIE_SECRET or ADMIN_PASSWORD (both invalidate every live cookie). */
const ADMIN_MAX_AGE = 8 * 60 * 60; // 8h

interface CookieOpts {
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
}

function serialize(name: string, value: string, opts: CookieOpts): string {
  const parts = [`${name}=${value}`];
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
  parts.push(`Path=${opts.path ?? "/"}`);
  parts.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  if (config.secureCookies) parts.push("Secure");
  return parts.join("; ");
}

function append(res: VercelResponse, cookie: string): void {
  const prev = res.getHeader("Set-Cookie");
  const arr = !prev ? [] : Array.isArray(prev) ? prev.map(String) : [String(prev)];
  arr.push(cookie);
  res.setHeader("Set-Cookie", arr);
}

/* --- HMAC signing (used for the transient OAuth cookie so `state`/`verifier`
   can't be forged, and for the admin session cookie) --- */
const b64url = (buf: Buffer) => buf.toString("base64url");

/**
 * Three different things are signed with the one COOKIE_SECRET: the transient
 * OAuth cookie, the admin session cookie, and the unsubscribe link (see
 * email/unsubscribe.ts). Every signature therefore commits to the context it was
 * minted for, so a blob signed for one purpose can't be replayed as another.
 *
 * Nothing is known to be forgeable without this — an admin cookie needs a
 * payload that JSON-parses to `{exp}`, which neither of the other two shapes can
 * produce today. The tag is here so that stays true as those payloads change,
 * rather than resting on a coincidence of formats.
 */
type SigContext = "tx" | "admin";

function sign(payload: string, context: SigContext): string {
  return crypto
    .createHmac("sha256", config.cookieSecret)
    .update(`${context}|${payload}`)
    .digest("base64url");
}

function verify(payload: string, sig: string, context: SigContext): boolean {
  const a = new Uint8Array(Buffer.from(sig));
  const b = new Uint8Array(Buffer.from(sign(payload, context)));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface TxData {
  verifier: string;
  state: string;
  nonce: string;
  redirect: string;
}

export function setTxCookie(res: VercelResponse, data: TxData): void {
  const payload = b64url(Buffer.from(JSON.stringify(data)));
  append(
    res,
    serialize(COOKIE.tx, `${payload}.${sign(payload, "tx")}`, { maxAge: TX_MAX_AGE, path: API_PATH }),
  );
}

export function readTxCookie(req: VercelRequest): TxData | null {
  const raw = req.cookies?.[COOKIE.tx];
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!verify(payload, sig, "tx")) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as TxData;
  } catch {
    return null;
  }
}

export function clearTxCookie(res: VercelResponse): void {
  append(res, serialize(COOKIE.tx, "", { maxAge: 0, path: API_PATH }));
}

export interface TokenCookies {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  /** epoch ms at which the access token expires */
  expiresAt: number;
}

export function setTokenCookies(res: VercelResponse, t: TokenCookies): void {
  append(res, serialize(COOKIE.access, t.accessToken, { path: API_PATH }));
  append(res, serialize(COOKIE.accessExp, String(t.expiresAt), { path: API_PATH }));
  append(res, serialize(COOKIE.refresh, t.refreshToken, { path: API_PATH }));
  if (t.idToken) append(res, serialize(COOKIE.idToken, t.idToken, { path: API_PATH }));
}

/* --- "just logged out" marker ---------------------------------------------
   Set on logout, read and cleared by the next /api/auth/login. Not security-
   sensitive (worst case: someone sees the login form when they'd have been
   SSO'd in), so it carries no signature. */

export function setFreshLoginCookie(res: VercelResponse): void {
  append(res, serialize(COOKIE.fresh, "1", { maxAge: FRESH_MAX_AGE, path: API_PATH }));
}

export const readFreshLogin = (req: VercelRequest): boolean =>
  req.cookies?.[COOKIE.fresh] === "1";

export function clearFreshLoginCookie(res: VercelResponse): void {
  append(res, serialize(COOKIE.fresh, "", { maxAge: 0, path: API_PATH }));
}

export function clearAuthCookies(res: VercelResponse): void {
  for (const name of [COOKIE.access, COOKIE.accessExp, COOKIE.refresh, COOKIE.idToken]) {
    append(res, serialize(name, "", { maxAge: 0, path: API_PATH }));
  }
}

export const readAccessToken = (req: VercelRequest) => req.cookies?.[COOKIE.access] ?? null;
export const readRefreshToken = (req: VercelRequest) => req.cookies?.[COOKIE.refresh] ?? null;
export const readIdToken = (req: VercelRequest) => req.cookies?.[COOKIE.idToken] ?? null;
export function readAccessExpiry(req: VercelRequest): number {
  const raw = req.cookies?.[COOKIE.accessExp];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : 0;
}

/* --- Admin console session ------------------------------------------------
   Stateless, like the transient OAuth cookie: a signed `{exp}` payload whose
   HMAC signature IS the proof of a prior successful password login. There is one
   shared owner password (ADMIN_PASSWORD) and no session store — see _lib/admin.ts.
   SameSite=Strict: this cookie never needs to survive a cross-site navigation the
   way the Lax OAuth cookie does, so we take the stricter setting. */

/** Mint an admin session cookie after a verified password login. */
export function setAdminCookie(res: VercelResponse): void {
  const exp = Date.now() + ADMIN_MAX_AGE * 1000;
  const payload = b64url(Buffer.from(JSON.stringify({ exp })));
  append(
    res,
    serialize(COOKIE.admin, `${payload}.${sign(payload, "admin")}`, {
      maxAge: ADMIN_MAX_AGE,
      path: API_PATH,
      sameSite: "Strict",
    }),
  );
}

/** True when the request carries a validly-signed, unexpired admin session. */
export function readAdminSession(req: VercelRequest): boolean {
  const raw = req.cookies?.[COOKIE.admin];
  if (!raw) return false;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return false;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!verify(payload, sig, "admin")) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp?: number };
    return typeof exp === "number" && Date.now() < exp;
  } catch {
    return false;
  }
}

export function clearAdminCookie(res: VercelResponse): void {
  append(res, serialize(COOKIE.admin, "", { maxAge: 0, path: API_PATH, sameSite: "Strict" }));
}
