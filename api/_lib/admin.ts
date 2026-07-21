/**
 * Owner ("admin") auth for the campaign console.
 *
 * There is exactly ONE admin and ONE shared secret, so there is no user table and
 * no session store — auth is two stateless pieces:
 *   - the password lives in ADMIN_PASSWORD (server-only, never VITE_-prefixed) and
 *     is compared in constant time here;
 *   - a verified login mints a signed, expiring cookie (see cookies.ts) whose HMAC
 *     signature IS the proof of that prior login.
 *
 * Fail-closed, same as CRON_SECRET: with no ADMIN_PASSWORD configured, nobody can
 * log in. Rotate ADMIN_PASSWORD (or COOKIE_SECRET) to invalidate every session.
 */
import crypto from "node:crypto";
import type { VercelRequest } from "@vercel/node";
import { readAdminSession } from "./cookies.js";

const env = (k: string) => process.env[k]?.trim() || "";

/** Whether an admin password is configured at all. Lets a handler log a clear
 *  warning on a misconfigured deploy instead of silently rejecting a correct-
 *  looking login. Never surfaced to the client — we still 401 uniformly. */
export const isAdminAuthConfigured = (): boolean => Boolean(env("ADMIN_PASSWORD"));

/**
 * Constant-time password check against ADMIN_PASSWORD.
 *
 * Fails closed: an unset/empty ADMIN_PASSWORD rejects every attempt, so a
 * misconfigured deploy can't be entered with a blank password. Both sides are
 * SHA-256'd before comparison so `timingSafeEqual` always sees equal-length
 * buffers and the expected password's length never leaks through an early bail.
 */
export function verifyPassword(input: unknown): boolean {
  const expected = env("ADMIN_PASSWORD");
  if (!expected) return false; // fail closed
  if (typeof input !== "string" || input.length === 0) return false;
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
}

/** True when the request carries a valid, unexpired admin session cookie. */
export function requireAdmin(req: VercelRequest): boolean {
  return readAdminSession(req);
}
