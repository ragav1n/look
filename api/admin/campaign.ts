/**
 * POST /api/admin/campaign
 *   body: { mode, subject, heading, body, ctaLabel?, ctaUrl?, imageUrl?,
 *           discountCode?, testEmail?, password? }
 *
 * The owner console's send path. Three modes:
 *   - preview: render one sample, return { html }, send nothing.  (session only)
 *   - test:    send only to testEmail.                            (session + password)
 *   - send:    blast every marketing subscriber.                  (session + password)
 *
 * Step-up: any mode that actually sends re-verifies the password, so a hijacked
 * session alone can neither blast the list nor send a single spoofed LOOK email.
 * Reuses the same compose → batch-send → signed-unsubscribe pipeline as the drop
 * cron, so campaigns are on-brand and keep one-click unsubscribe.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin, verifyPassword } from "../_lib/admin.js";
import { listSubscribers } from "../_lib/audience.js";
import { type CampaignInput, composeCampaign } from "../_lib/email/compose.js";
import { sendBatch, sendEmail } from "../_lib/email/send.js";
import { isSameOrigin, methodNotAllowed } from "../_lib/http.js";
import { allow } from "../_lib/ratelimit.js";
import { isAdminConfigured } from "../_lib/shopify.js";

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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
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
