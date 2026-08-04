/**
 * /api/account — the signed-in shopper's account-side BFF, as ONE Serverless
 * Function.
 *
 * The Hobby plan caps a deployment at 12 functions and we sit exactly on the
 * cap, so the two account endpoints share a function rather than taking a file
 * each. The URLs the SPA calls are unchanged; rewrites in vercel.json map them
 * here — the same trick as api/admin/console.ts, and for the same reason: the
 * SPA catch-all (`/(.*)` → /index.html) shadows dynamic `[action].ts` routes,
 * while a static function file plus an explicit rewrite wins against it.
 *   /api/account/welcome     → /api/account?action=welcome
 *   /api/account/newsletter  → /api/account?action=newsletter
 *
 * Both handlers identify the customer from the access token rather than by
 * email: Shopify's customer search index lags ~30–60s, so right after a first
 * sign-in an email lookup would miss.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  type AccountState,
  FLAG,
  readAccountState,
  setEmailConsent,
  writeFlag,
} from "../_lib/audience.js";
import {
  IDENTITY_QUERY,
  type RawIdentity,
  customerGraphql,
  toAdminCustomerGid,
} from "../_lib/customer.js";
import { sendLifecycleEmail } from "../_lib/email/compose.js";
import { firstQuery, isSameOrigin, methodNotAllowed } from "../_lib/http.js";
import { allow, clientIp } from "../_lib/ratelimit.js";
import { isAdminConfigured } from "../_lib/shopify.js";
import { getValidAccessToken } from "../_lib/tokens.js";

/** Which endpoint this is: the rewrite adds `?action=…`; if that's ever absent
 *  (a direct hit, or a Vercel change), fall back to sniffing the request path. */
function resolveAction(req: VercelRequest): "welcome" | "newsletter" | null {
  const q = firstQuery(req.query.action);
  if (q === "welcome" || q === "newsletter") return q;
  const url = req.url ?? "";
  if (url.includes("newsletter")) return "newsletter";
  if (url.includes("welcome")) return "welcome";
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  switch (resolveAction(req)) {
    case "welcome":
      await welcomeHandler(req, res);
      return;
    case "newsletter":
      await newsletterHandler(req, res);
      return;
    default:
      res.status(404).json({ error: "not_found" });
  }
}

/* ----------------------------------------------------------------- identity --
 * Both handlers need the customer's Admin GID. Answers 401 itself when the
 * session is gone, and returns null, so callers can `if (!id) return;`. */

async function identify(
  req: VercelRequest,
  res: VercelResponse,
): Promise<{ gid: string; email: string } | null> {
  const token = await getValidAccessToken(req, res);
  if (!token) {
    res.status(401).json({ error: "unauthenticated" });
    return null;
  }
  const gql = await customerGraphql(token, { query: IDENTITY_QUERY });
  const json = (await gql.json()) as { data?: { customer?: RawIdentity | null } };
  const customer = json.data?.customer;
  const email = customer?.emailAddress?.emailAddress ?? "";
  const gid = customer?.id ? toAdminCustomerGid(customer.id) : null;
  return gid ? { gid, email } : null;
}

/* ------------------------------------------------------------------ welcome --
 * POST → sends the "your account is ready" email the first time a customer
 * signs in, and puts them on the newsletter. The SPA fires this once after the
 * post-login redirect (see UserProvider); each action is guarded by its own
 * metafield, so a double effect or a refresh can't repeat either one.
 *
 * The welcome email is a distinct email from the newsletter welcome: it speaks
 * to account features (orders, addresses, wishlist) and carries no discount. */

async function welcomeHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  // No Admin API ⇒ we can read neither guard metafield, so we can promise
  // neither once-only delivery nor a once-only opt-in. Skip rather than risk
  // emailing on every sign-in.
  if (!isAdminConfigured()) {
    res.status(200).json({ sent: false, reason: "email_not_configured" });
    return;
  }

  try {
    const id = await identify(req, res);
    if (!id) {
      if (!res.headersSent) res.status(200).json({ sent: false, reason: "no_identity" });
      return;
    }

    const state = await readAccountState(id.gid);
    if (!state || !id.email) {
      res.status(200).json({ sent: false, reason: "no_identity" });
      return;
    }

    const subscribed = await optInOnce(id.gid, state);

    if (state.welcomeSent) {
      res.status(200).json({ sent: false, reason: "already_sent", subscribed });
      return;
    }

    const sent = await sendLifecycleEmail("welcome_account", id.email);
    if (sent) await writeFlag(id.gid, FLAG.accountWelcome);
    res.status(200).json({ sent, subscribed });
  } catch (err) {
    // Never fail the sign-in over a welcome email. Log and move on.
    console.error("[account/welcome] failed:", err);
    res.status(200).json({ sent: false, reason: "error" });
  }
}

/**
 * Put a new account holder on the newsletter — once, and never against their
 * wishes. Returns the subscription state they end up in.
 *
 * Two rules make this safe to run on a sign-in hook:
 *   - An UNSUBSCRIBED customer is left alone. Someone who opted out before ever
 *     creating an account (from a newsletter email, say) must not be quietly
 *     resurrected by signing in.
 *   - The flag is written either way, including when we skip. Without that,
 *     every later sign-in would re-apply consent and undo an unsubscribe.
 *
 * Best-effort throughout: a failure here means someone isn't on the list, which
 * is a far better outcome than a broken sign-in.
 */
async function optInOnce(gid: string, state: AccountState): Promise<boolean> {
  if (state.optInSet) return state.subscribed;

  const optIn = state.marketingState !== "UNSUBSCRIBED";
  const ok = optIn && (await setEmailConsent(gid, "SUBSCRIBED"));
  await writeFlag(gid, FLAG.accountOptIn);
  return ok;
}

/* --------------------------------------------------------------- newsletter --
 * The account page's own subscribe toggle.
 *   GET  → { subscribed }
 *   POST   body { subscribed: boolean } → sets it, answers with what was stored.
 *
 * Consent is read and written through the Admin API, keyed on the id from the
 * access token, rather than through the Customer Account API: Shopify is the
 * single source of truth for consent (see _lib/audience.ts), and going through
 * the same door keeps this toggle, the unsubscribe links in our emails and the
 * client's own Shopify campaigns on one list. */

async function newsletterHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const write = req.method === "POST";
  if (req.method !== "GET" && !write) return methodNotAllowed(res, "GET, POST");
  if (write && !isSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (!isAdminConfigured()) {
    res.status(503).json({ error: "newsletter_not_configured" });
    return;
  }
  // The store's Admin API rate limit is shared with the newsletter endpoint and
  // the drop cron, so a hammered toggle must not be able to starve them.
  if (write && !allow(`account-newsletter:${clientIp(req)}`, 20, 60_000)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  try {
    const id = await identify(req, res);
    if (!id) {
      if (!res.headersSent) res.status(404).json({ error: "no_identity" });
      return;
    }

    const state = await readAccountState(id.gid);
    if (!state) {
      res.status(404).json({ error: "no_identity" });
      return;
    }
    if (!write) {
      res.status(200).json({ subscribed: state.subscribed });
      return;
    }

    const wanted = req.body?.subscribed === true;
    if (wanted === state.subscribed) {
      res.status(200).json({ subscribed: state.subscribed });
      return;
    }

    const ok = await setEmailConsent(id.gid, wanted ? "SUBSCRIBED" : "UNSUBSCRIBED");
    if (!ok) {
      res.status(502).json({ error: "consent_update_failed" });
      return;
    }
    // Deciding it here settles the one-time sign-in opt-in for good — belt and
    // braces for the case where its own flag write didn't land.
    if (!state.optInSet) await writeFlag(id.gid, FLAG.accountOptIn);
    res.status(200).json({ subscribed: wanted });
  } catch (err) {
    console.error("[account/newsletter] failed:", err);
    res.status(502).json({ error: "upstream_error" });
  }
}
