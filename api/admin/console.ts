/**
 * /api/admin/console — the owner console's BFF, as ONE Serverless Function.
 *
 * The Hobby plan caps a deployment at 12 functions, so the two admin endpoints
 * share a single function rather than a file each. The two real URLs the SPA
 * calls (src/lib/admin.ts) are mapped here by rewrites in vercel.json:
 *   /api/admin/session   → /api/admin/console?action=session   (GET check · POST login · DELETE logout)
 *   /api/admin/campaign  → /api/admin/console?action=campaign  (compose/preview/test/send)
 *
 * Why rewrites and not a dynamic `[action].ts` route: this project's SPA
 * catch-all rewrite (`/(.*)` → /index.html) shadows dynamic API routes — a
 * `[action]` file falls through to index.html and every call 405s. Static
 * function files win against the catch-all, and an explicit rewrite (evaluated
 * before it) routes the pretty URLs here. The `action` comes in via the rewrite
 * destination's query, with a path fallback for safety.
 *
 * The two handlers below are the former api/admin/session.ts and
 * api/admin/campaign.ts, moved verbatim; only this dispatcher is new.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAdminAuthConfigured, requireAdmin, verifyPassword } from "../_lib/admin.js";
import { clearAdminCookie, setAdminCookie } from "../_lib/cookies.js";
import { firstQuery, isSameOrigin, isStrictSameOrigin, methodNotAllowed } from "../_lib/http.js";
import { allow, clientIp } from "../_lib/ratelimit.js";
import { listSubscribers } from "../_lib/audience.js";
import { type CampaignInput, composeCampaign } from "../_lib/email/compose.js";
import { sendBatch, sendEmail } from "../_lib/email/send.js";
import { isAdminConfigured } from "../_lib/shopify.js";

/** Which endpoint this is: the rewrite adds `?action=…`; if that's ever absent
 *  (a direct hit, or a Vercel change), fall back to sniffing the request path. */
function resolveAction(req: VercelRequest): "session" | "campaign" | null {
  const q = firstQuery(req.query.action);
  if (q === "session" || q === "campaign") return q;
  const url = req.url ?? "";
  if (url.includes("campaign")) return "campaign";
  if (url.includes("session")) return "session";
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  switch (resolveAction(req)) {
    case "session":
      sessionHandler(req, res);
      return;
    case "campaign":
      await campaignHandler(req, res);
      return;
    default:
      res.status(404).json({ error: "not_found" });
  }
}

/* ------------------------------------------------------------------ session --
 *   GET    → { authenticated } so the SPA can gate the console UI without ever
 *            exposing the password or the session's contents to the browser.
 *   POST   → login. Verifies the shared owner password (body: { password }) and
 *            mints the admin session cookie. Fail closed (no ADMIN_PASSWORD ⇒
 *            always 401), strict same-origin (unauthenticated state-changing
 *            request), and per-IP rate-limited against brute force.
 *   DELETE → logout. Clears the admin session cookie.
 */
function sessionHandler(req: VercelRequest, res: VercelResponse): void {
  switch (req.method) {
    case "GET":
      res.status(200).json({ authenticated: requireAdmin(req) });
      return;
    case "POST":
      login(req, res);
      return;
    case "DELETE":
      logout(req, res);
      return;
    default:
      methodNotAllowed(res, "GET, POST, DELETE");
  }
}

function login(req: VercelRequest, res: VercelResponse): void {
  if (!isStrictSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  // Best-effort throttle (per warm instance): cap password guesses from one IP.
  if (!allow(`admin-login:${clientIp(req)}`, 5, 60_000)) {
    res.status(429).json({ ok: false, error: "rate_limited" });
    return;
  }
  // A misconfigured deploy 401s like a wrong password — no info leak to the
  // client — but leaves a breadcrumb in the function logs for whoever set it up.
  if (!isAdminAuthConfigured()) {
    console.warn("[admin/session] ADMIN_PASSWORD is not set — no login is possible.");
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  if (!verifyPassword(body.password)) {
    res.status(401).json({ ok: false, error: "invalid_password" });
    return;
  }
  setAdminCookie(res);
  res.status(200).json({ ok: true });
}

function logout(req: VercelRequest, res: VercelResponse): void {
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  clearAdminCookie(res);
  res.status(200).json({ ok: true });
}

/* ----------------------------------------------------------------- campaign --
 * POST body: { mode, subject, heading, body, ctaLabel?, ctaUrl?, imageUrl?,
 *              discountCode?, testEmail?, password? }
 * Three modes:
 *   - preview: render one sample, return { html }, send nothing.  (session only)
 *   - test:    send only to testEmail.                            (session + password)
 *   - send:    blast every marketing subscriber.                  (session + password)
 *
 * Step-up: any mode that actually sends re-verifies the password, so a hijacked
 * session alone can neither blast the list nor send a single spoofed LOOK email.
 * Reuses the same compose → batch-send → signed-unsubscribe pipeline as the drop
 * cron, so campaigns are on-brand and keep one-click unsubscribe.
 */

/* Loose — Resend does the authoritative validation. Just rejects obvious junk. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Split a textarea body into paragraphs on blank lines, collapsing single
 *  newlines within a paragraph — the same shape getEmailContent produces. */
function toParagraphs(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

/** Validate + normalise the form fields, or null if the essentials are missing. */
function readInput(body: Record<string, unknown>): CampaignInput | null {
  const asStr = (v: unknown): string => (typeof v === "string" ? v : "");
  const subject = asStr(body.subject).trim();
  const heading = asStr(body.heading).trim();
  const paragraphs = toParagraphs(body.body);
  if (!subject || !heading || !paragraphs.length) return null;

  const opt = (v: unknown): string | undefined => asStr(v).trim() || undefined;
  return {
    subject,
    heading,
    body: paragraphs,
    ctaLabel: opt(body.ctaLabel),
    ctaUrl: opt(body.ctaUrl),
    imageUrl: opt(body.imageUrl),
    discountCode: opt(body.discountCode),
  };
}

async function campaignHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (!requireAdmin(req)) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const mode = body.mode;
  const input = readInput(body);
  if (!input) {
    res.status(400).json({ ok: false, error: "missing_fields" });
    return;
  }

  // Preview: the session is enough, nothing leaves the building.
  if (mode === "preview") {
    const sample = composeCampaign("preview@look.ind.in", input);
    res.status(200).json({ ok: true, html: sample.html });
    return;
  }

  // test / send both deliver real mail → step-up password required.
  if (mode !== "test" && mode !== "send") {
    res.status(400).json({ ok: false, error: "bad_mode" });
    return;
  }
  if (!verifyPassword(body.password)) {
    res.status(401).json({ ok: false, error: "password_required" });
    return;
  }
  if (!isAdminConfigured()) {
    res.status(500).json({ ok: false, error: "admin_not_configured" });
    return;
  }

  try {
    if (mode === "test") {
      const testEmail = typeof body.testEmail === "string" ? body.testEmail.trim() : "";
      if (!EMAIL_RE.test(testEmail)) {
        res.status(400).json({ ok: false, error: "invalid_test_email" });
        return;
      }
      const ok = await sendEmail(composeCampaign(testEmail, input));
      res.status(200).json({ ok, mode: "test", sent: ok ? 1 : 0 });
      return;
    }

    // mode === "send": blast the list. A short cooldown on top of the UI confirm
    // stops a double-click (or an accidental retry) from mailing everyone twice.
    if (!allow("admin-campaign-send", 1, 60_000)) {
      res.status(429).json({
        ok: false,
        error: "cooldown",
        message: "A campaign was just sent — wait a minute before sending again.",
      });
      return;
    }
    const subscribers = await listSubscribers();
    const emails = subscribers.map((s) => composeCampaign(s.email, input));
    const result = await sendBatch(emails);
    res.status(200).json({
      ok: true,
      mode: "send",
      recipients: subscribers.length,
      sent: result.sent,
      failed: result.failed,
      simulated: result.simulated,
    });
  } catch (err) {
    console.error("[admin/campaign] failed:", err);
    res.status(502).json({ ok: false, error: "campaign_failed" });
  }
}
