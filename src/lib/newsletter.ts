/**
 * Newsletter subscribe — the SPA half. POSTs an email to the BFF, which marks it
 * SUBSCRIBED on Shopify (see api/newsletter/subscribe.ts). Both the home band
 * (SignupBanner) and the timed popup (NewsletterPopup) call this so they can't
 * drift in behaviour.
 */

export interface SubscribeResult {
  ok: boolean;
  /** Server-reported: the address was already a customer (still a success). */
  already?: boolean;
}

/** Subscribe `email` to the LOOK newsletter. Resolves `{ ok:false }` on a real
 *  backend failure so callers can show an inline error. */
export async function subscribeEmail(email: string): Promise<SubscribeResult> {
  try {
    const res = await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email }),
    });
    const data = (await res.json().catch(() => ({}))) as SubscribeResult;
    return { ok: res.ok && data.ok !== false, already: data.already };
  } catch {
    // Plain `npm run dev` serves no /api routes, so the fetch throws. Treat that
    // as success in dev only, so the UI is testable without the BFF (the real
    // end-to-end path is `npm run dev:bff`). In production a network failure is
    // a genuine failure and must surface.
    if (import.meta.env.DEV) return { ok: true };
    return { ok: false };
  }
}
