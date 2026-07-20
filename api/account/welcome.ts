/**
 * POST /api/account/welcome
 * Sends the "your account is ready" email the first time a customer signs in.
 * The SPA fires this once after the post-login redirect (see UserProvider); the
 * metafield guard makes a duplicate call a no-op, so a double effect or a
 * refresh can't produce a second email.
 *
 * This is a distinct email from the newsletter welcome: it speaks to account
 * features (orders, addresses, wishlist) and carries no discount, and signing
 * in does NOT subscribe anyone to marketing — the two lists stay separate.
 *
 * The customer id is read from the access token, not searched for by email:
 * Shopify's customer search index lags ~30–60s, so right after a first sign-in
 * an email lookup would miss and the welcome would silently never send.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { FLAG, readFlag, writeFlag } from "../_lib/audience.js";
import {
  IDENTITY_QUERY,
  type RawIdentity,
  customerGraphql,
  toAdminCustomerGid,
} from "../_lib/customer.js";
import { sendLifecycleEmail } from "../_lib/email/compose.js";
import { isSameOrigin, methodNotAllowed } from "../_lib/http.js";
import { isAdminConfigured } from "../_lib/shopify.js";
import { getValidAccessToken } from "../_lib/tokens.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const token = await getValidAccessToken(req, res);
  if (!token) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  // No Admin API ⇒ we can't read/write the guard metafield, so we can't promise
  // once-only delivery. Skip rather than risk emailing on every sign-in.
  if (!isAdminConfigured()) {
    res.status(200).json({ sent: false, reason: "email_not_configured" });
    return;
  }

  try {
    const gql = await customerGraphql(token, { query: IDENTITY_QUERY });
    const json = (await gql.json()) as { data?: { customer?: RawIdentity | null } };
    const customer = json.data?.customer;
    const email = customer?.emailAddress?.emailAddress ?? "";
    const gid = customer?.id ? toAdminCustomerGid(customer.id) : null;

    if (!email || !gid) {
      res.status(200).json({ sent: false, reason: "no_identity" });
      return;
    }

    const flag = await readFlag(gid, FLAG.accountWelcome);
    if (flag?.alreadySent) {
      res.status(200).json({ sent: false, reason: "already_sent" });
      return;
    }

    const sent = await sendLifecycleEmail("welcome_account", email);
    if (sent) await writeFlag(gid, FLAG.accountWelcome);
    res.status(200).json({ sent });
  } catch (err) {
    // Never fail the sign-in over a welcome email. Log and move on.
    console.error("[account/welcome] failed:", err);
    res.status(200).json({ sent: false, reason: "error" });
  }
}
