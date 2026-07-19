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
} as const;

const API_PATH = "/api";
const TX_MAX_AGE = 600; // 10 min — the OAuth round-trip should take seconds

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
   can't be forged) --- */
const b64url = (buf: Buffer) => buf.toString("base64url");

function sign(payload: string): string {
  return crypto.createHmac("sha256", config.cookieSecret).update(payload).digest("base64url");
}

function verify(payload: string, sig: string): boolean {
  const a = new Uint8Array(Buffer.from(sig));
  const b = new Uint8Array(Buffer.from(sign(payload)));
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
  append(res, serialize(COOKIE.tx, `${payload}.${sign(payload)}`, { maxAge: TX_MAX_AGE, path: API_PATH }));
}

export function readTxCookie(req: VercelRequest): TxData | null {
  const raw = req.cookies?.[COOKIE.tx];
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!verify(payload, sig)) return null;
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
