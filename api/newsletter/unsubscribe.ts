/**
 * GET|POST /api/newsletter/unsubscribe?e=<b64url email>&t=<hmac>
 *
 * Opt-out for every email we send. Reached from an inbox with no session and no
 * cookie, so the address travels in the URL — HMAC-signed so a link can't be
 * hand-crafted to unsubscribe somebody else.
 *
 *   GET   the footer link — flips consent and renders a confirmation page.
 *   POST  Gmail/Yahoo's one-click control, promised by the List-Unsubscribe-Post
 *         header. Same effect, no body. RFC 8058 requires this to work without
 *         any further interaction, so there is deliberately no "are you sure".
 *
 * Deliberately NOT same-origin guarded: the whole point is that it works from
 * outside. The signature is what makes that safe.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { findCustomerIdByEmail, setEmailConsent } from "../_lib/audience.js";
import { firstQuery } from "../_lib/http.js";
import { palette, site } from "../_lib/email/brand.js";
import { isAdminConfigured } from "../_lib/shopify.js";
import { verifyUnsubscribe } from "../_lib/email/unsubscribe.js";

function page(res: VercelResponse, status: number, title: string, message: string): void {
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} · ${site.name}</title>
</head>
<body style="margin:0;background:${palette.page};color:${palette.body};font-family:'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:96px 24px;text-align:center;">
    <a href="https://look.ind.in" style="font-family:Georgia,serif;font-size:28px;letter-spacing:9px;color:${palette.ink};text-decoration:none;">${site.name}</a>
    <h1 style="margin:44px 0 14px;font-family:Georgia,serif;font-size:24px;font-weight:500;color:${palette.ink};">${title}</h1>
    <p style="margin:0 0 32px;font-size:15px;line-height:1.7;">${message}</p>
    <a href="https://look.ind.in" style="display:inline-block;padding:13px 30px;border-radius:8px;background:${palette.accent};color:#fff;font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;text-decoration:none;">Back to ${site.name}</a>
  </div>
</body></html>`;
  res.status(status).setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const oneClick = req.method === "POST";
  if (req.method !== "GET" && !oneClick) {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const email = verifyUnsubscribe(firstQuery(req.query.e), firstQuery(req.query.t));
  if (!email) {
    if (oneClick) {
      res.status(400).json({ ok: false, error: "invalid_link" });
      return;
    }
    page(
      res,
      400,
      "This link isn't valid",
      `It may have been broken by your email app. Write to <a href="mailto:${site.email}" style="color:${palette.muted};">${site.email}</a> and we'll take you off the list by hand.`,
    );
    return;
  }

  /* Unsubscribing must always LOOK successful to the recipient. If we can't
     reach Shopify, saying "something went wrong" invites them to hit spam
     instead — which costs far more than a retry would have. The failure is
     logged for us, not shown to them. */
  if (isAdminConfigured()) {
    try {
      const id = await findCustomerIdByEmail(email);
      if (id) await setEmailConsent(id, "UNSUBSCRIBED");
      else console.warn(`[unsubscribe] no customer found for ${email}`);
    } catch (err) {
      console.error(`[unsubscribe] failed for ${email}:`, err);
    }
  }

  if (oneClick) {
    res.status(200).json({ ok: true });
    return;
  }
  page(
    res,
    200,
    "You're unsubscribed",
    `We won't email <strong style="color:${palette.ink};">${email.replace(/</g, "&lt;")}</strong> again. You can still shop and check your orders as usual — this only stops the newsletter.`,
  );
}
