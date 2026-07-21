/**
 * Ties the three pieces together: metaobject copy → rendered HTML → an
 * OutgoingEmail with a per-recipient unsubscribe link and the List-Unsubscribe
 * headers. Callers (the subscribe endpoint, the account-welcome endpoint, the
 * drop cron) do one call each so the three emails can't drift apart.
 */
import { getEmailContent, type EmailKey } from "./content.js";
import { renderEmail, type EmailProduct } from "./render.js";
import { sendEmail, type OutgoingEmail } from "./send.js";
import { listUnsubscribeHeaders, unsubscribeUrl } from "./unsubscribe.js";

export interface ComposeOptions {
  /** Products to feature — the drop email's whole point. */
  products?: EmailProduct[];
}

export async function composeEmail(
  key: EmailKey,
  to: string,
  opts: ComposeOptions = {},
): Promise<OutgoingEmail> {
  const content = await getEmailContent(key);
  const unsub = unsubscribeUrl(to);

  const { html, text } = renderEmail({
    heading: content.heading,
    body: content.body,
    cta: { label: content.ctaLabel, url: content.ctaUrl },
    imageUrl: content.imageUrl,
    code: content.discountCode ? { label: "Your code", value: content.discountCode } : undefined,
    products: opts.products,
    unsubscribeUrl: unsub,
  });

  return {
    to,
    subject: content.subject,
    html,
    text,
    headers: listUnsubscribeHeaders(unsub),
  };
}

/** Compose and send to one person. Best-effort: never throws, so a mail failure
 *  can't take down the signup or login it rode in on. */
export async function sendLifecycleEmail(
  key: EmailKey,
  to: string,
  opts: ComposeOptions = {},
): Promise<boolean> {
  try {
    return await sendEmail(await composeEmail(key, to, opts));
  } catch (err) {
    console.error(`[email] ${key} to ${to} failed to compose/send:`, err);
    return false;
  }
}

/** Free-form owner campaign (a 24hr sale, a launch teaser). */
export interface CampaignInput {
  subject: string;
  heading: string;
  /** Body paragraphs, in order. */
  body: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  discountCode?: string;
  preheader?: string;
}

/**
 * Compose a one-off campaign from copy typed into the admin console. Unlike
 * composeEmail this takes its copy directly rather than from the fixed
 * `email_template` metaobject, so it needs no EmailKey — the union stays closed.
 * renderEmail esc()-escapes every field, so owner-authored copy can't inject into
 * recipients' inboxes. Each recipient still gets their own signed unsubscribe link
 * and the List-Unsubscribe headers that keep a bulk send deliverable. Synchronous:
 * there's no metaobject read to await.
 */
export function composeCampaign(to: string, input: CampaignInput): OutgoingEmail {
  const unsub = unsubscribeUrl(to);
  const { html, text } = renderEmail({
    preheader: input.preheader,
    heading: input.heading,
    body: input.body,
    cta: input.ctaLabel && input.ctaUrl ? { label: input.ctaLabel, url: input.ctaUrl } : undefined,
    imageUrl: input.imageUrl,
    code: input.discountCode ? { label: "Your code", value: input.discountCode } : undefined,
    unsubscribeUrl: unsub,
  });
  return { to, subject: input.subject, html, text, headers: listUnsubscribeHeaders(unsub) };
}
