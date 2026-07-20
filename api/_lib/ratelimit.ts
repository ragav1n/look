/**
 * Best-effort, dependency-free in-memory rate limiter for the BFF.
 *
 * ⚠️ Serverless instances don't share memory, so this caps abuse PER WARM
 * INSTANCE only. It raises the bar against casual scripting and accidental
 * loops, but is NOT a substitute for a shared store (Vercel KV / Upstash) or a
 * CAPTCHA against a determined, distributed attacker. See the newsletter
 * "Residual Risk" note in the security plan.
 */
import type { VercelRequest } from "@vercel/node";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Fixed-window limiter: allow `limit` hits per `windowMs` for `key`. Returns
 *  false once the allowance is spent for the current window. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    // Opportunistic sweep so a long-lived instance can't grow the map forever.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** Best-effort client IP from Vercel's forwarding header. */
export function clientIp(req: VercelRequest): string {
  const xff = req.headers["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff[0] : xff ?? "";
  return raw.split(",")[0]?.trim() || "unknown";
}
