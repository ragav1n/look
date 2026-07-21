/**
 * Email HTML + plain-text rendering. One layout serves all three lifecycle
 * emails; the drop email is the same shell with a product block in the middle.
 *
 * Everything here is deliberately old-fashioned — nested tables, inline styles,
 * no flex/grid, no <style> block, no web fonts. Gmail strips <style>, Outlook
 * renders through Word, and neither loads a Google Font, so anything modern
 * degrades into an unstyled column. `--font-display` falls back to Georgia,
 * which carries the same serif tone as Playfair.
 *
 * Layout is single-column at 600px: multi-column grids can't stack without
 * media queries (which Gmail ignores), and full-width imagery is the brand's
 * stated preference anyway.
 */
import { palette, site } from "./brand.js";

const SANS = "'Poppins', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const WIDTH = 600;

/* The white wordmark, served from the SPA's public/ dir so it's a stable
   absolute URL (email can't use bundled or inline-SVG assets). It's white on
   transparent, which sits right on the email's black background. NOTE: this URL
   only resolves once the site is deployed — a local send before deploy shows a
   broken image, which is expected. */
const LOGO_URL = "https://look.ind.in/email-logo.png";

/** Safety ceiling on products in one drop email. Full-width portraits are heavy,
 *  but a collection launch should still arrive as ONE email rather than losing
 *  pieces, so this sits well above any realistic single-day drop. The cron fetches,
 *  shows, and tags exactly the same set (see api/cron/new-drop.ts), so anything
 *  beyond this ceiling stays un-tagged and rolls into the next day, never vanishes. */
export const MAX_PRODUCTS = 24;

export interface EmailProduct {
  title: string;
  url: string;
  imageUrl?: string;
  /** Pre-formatted, e.g. "from ₹2,299" — prices differ per size on this store. */
  priceLabel?: string;
}

export interface EmailOptions {
  /** Inbox preview line. Falls back to the first body paragraph. */
  preheader?: string;
  heading: string;
  /** Body paragraphs, in order. */
  body: string[];
  cta?: { label: string; url: string };
  /** Full-width hero image above the heading. */
  imageUrl?: string;
  /** Boxed callout, e.g. a discount code. */
  code?: { label: string; value: string };
  products?: EmailProduct[];
  unsubscribeUrl: string;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

/** Escape for HTML text/attribute context. Copy lands here from a Shopify
 *  metaobject the client edits, so it is never assumed safe. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const row = (content: string) =>
  `<tr><td style="padding:0 32px;">${content}</td></tr>`;

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.7;color:${palette.body};">${esc(
    text,
  )}</p>`;
}

function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 4px;">
  <tr><td bgcolor="${palette.accent}" style="border-radius:8px;">
    <a href="${esc(url)}" style="display:inline-block;padding:14px 32px;font-family:${SANS};font-size:13px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#ffffff;text-decoration:none;">${esc(
      label,
    )}</a>
  </td></tr>
</table>`;
}

function codeBox(label: string, value: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 20px;">
  <tr><td align="center" style="border:1px dashed ${palette.line};border-radius:8px;padding:18px 12px;background-color:${palette.surface};">
    <div style="font-family:${SANS};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${palette.muted};">${esc(
      label,
    )}</div>
    <div style="margin-top:8px;font-family:${SANS};font-size:24px;font-weight:600;letter-spacing:3px;color:${palette.ink};">${esc(
      value,
    )}</div>
  </td></tr>
</table>`;
}

function productBlock(p: EmailProduct): string {
  const image = p.imageUrl
    ? `<a href="${esc(p.url)}"><img src="${esc(p.imageUrl)}" width="${WIDTH - 64}" alt="${esc(
        p.title,
      )}" style="display:block;width:100%;max-width:${WIDTH - 64}px;height:auto;border:0;border-radius:6px;" /></a>`
    : "";
  const price = p.priceLabel
    ? `<div style="margin-top:4px;font-family:${SANS};font-size:14px;color:${palette.muted};">${esc(
        p.priceLabel,
      )}</div>`
    : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 28px;">
  <tr><td>${image}</td></tr>
  <tr><td style="padding-top:12px;">
    <a href="${esc(p.url)}" style="font-family:${SERIF};font-size:19px;color:${palette.ink};text-decoration:none;">${esc(
      p.title,
    )}</a>
    ${price}
  </td></tr>
</table>`;
}

export function renderEmail(opts: EmailOptions): RenderedEmail {
  const preheader = opts.preheader || opts.body[0] || "";

  const hero = opts.imageUrl
    ? `<tr><td style="padding:0 0 8px;"><img src="${esc(
        opts.imageUrl,
      )}" width="${WIDTH}" alt="" style="display:block;width:100%;max-width:${WIDTH}px;height:auto;border:0;" /></td></tr>`
    : "";

  const products = opts.products?.length
    ? row(opts.products.slice(0, MAX_PRODUCTS).map(productBlock).join(""))
    : "";

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark light" />
<meta name="supported-color-schemes" content="dark light" />
<title>${esc(opts.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${palette.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(
    preheader,
  )}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${palette.page};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${WIDTH}" style="width:100%;max-width:${WIDTH}px;background-color:${palette.page};">

  <tr><td align="center" style="padding:0 32px 28px;">
    <a href="https://look.ind.in">
      <img src="${LOGO_URL}" width="150" alt="${site.name}" style="display:block;width:150px;max-width:150px;height:auto;border:0;" />
    </a>
  </td></tr>

  ${hero}

  ${row(
    `<h1 style="margin:16px 0 18px;font-family:${SERIF};font-size:27px;line-height:1.3;font-weight:500;text-align:center;color:${palette.ink};">${esc(
      opts.heading,
    )}</h1>`,
  )}

  ${row(opts.body.map(paragraph).join(""))}

  ${opts.code ? row(codeBox(opts.code.label, opts.code.value)) : ""}

  ${products}

  ${opts.cta ? row(button(opts.cta.label, opts.cta.url)) : ""}

  <tr><td style="padding:36px 32px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td style="border-top:1px solid ${palette.line};font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>
  </td></tr>

  <tr><td align="center" style="padding:20px 32px 0;">
    <p style="margin:0 0 8px;font-family:${SANS};font-size:12px;line-height:1.7;color:${palette.faint};">
      ${site.name} — ${esc(site.tagline)}<br />
      <a href="${site.instagram}" style="color:${palette.muted};text-decoration:none;">${site.instagramHandle}</a>
      &nbsp;·&nbsp;
      <a href="mailto:${site.email}" style="color:${palette.muted};text-decoration:none;">${site.email}</a>
    </p>
    <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.7;color:${palette.faint};">
      You're receiving this because you signed up at look.ind.in.<br />
      <a href="${esc(opts.unsubscribeUrl)}" style="color:${palette.faint};text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    site.name.toUpperCase(),
    "",
    opts.heading,
    "",
    ...opts.body,
    ...(opts.code ? ["", `${opts.code.label}: ${opts.code.value}`] : []),
    ...(opts.products?.length
      ? [
          "",
          ...opts.products
            .slice(0, MAX_PRODUCTS)
            .map((p) => `- ${p.title}${p.priceLabel ? ` (${p.priceLabel})` : ""}\n  ${p.url}`),
        ]
      : []),
    ...(opts.cta ? ["", `${opts.cta.label}: ${opts.cta.url}`] : []),
    "",
    "---",
    `${site.name} — ${site.tagline}`,
    `${site.instagramHandle}  ${site.instagram}`,
    site.email,
    "",
    "You're receiving this because you signed up at look.ind.in.",
    `Unsubscribe: ${opts.unsubscribeUrl}`,
  ].join("\n");

  return { html, text };
}
