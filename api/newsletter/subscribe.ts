/**
 * POST /api/newsletter/subscribe   body: { email }
 * Marks an email as SUBSCRIBED to email marketing on the Shopify store and
 * sends the welcome email.
 *
 * Uses the SERVER-ONLY Admin API token (config.adminToken) — it can create
 * customers, so it must never reach the browser. This is the newsletter twin of
 * api/cart/link.ts: same-origin guarded, best-effort, JSON in/out.
 *
 * We send the welcome ourselves rather than leaning on Shopify's "Welcome new
 * subscribers" automation, which never fired for us: it triggers on an
 * unsubscribed→subscribed *transition*, and a customer created already
 * subscribed never emits one. That automation must stay OFF in the admin, or
 * new subscribers would collect two welcomes.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  FLAG,
  findCustomerIdByEmail,
  readFlag,
  setEmailConsent,
  writeFlag,
} from "../_lib/audience.js";
import { sendLifecycleEmail } from "../_lib/email/compose.js";
import { isStrictSameOrigin, methodNotAllowed } from "../_lib/http.js";
import { allow, clientIp } from "../_lib/ratelimit.js";
import { adminGraphql, isAdminConfigured } from "../_lib/shopify.js";

/* Deliberately loose — Shopify does the authoritative validation. This only
   rejects obvious junk so we don't spend an Admin API call on it. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CUSTOMER_CREATE = /* GraphQL */ `
  mutation NewsletterCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer { id }
      userErrors { field message }
    }
  }
`;

interface UserError {
  field?: string[] | null;
  message: string;
}

/** Send the welcome once and only once, guarded by a customer metafield. The
 *  guard is what stops someone who re-enters their address — or unsubscribes
 *  and signs up again — from collecting a second discount code. */
async function welcomeOnce(customerId: string, email: string): Promise<boolean> {
  const flag = await readFlag(customerId, FLAG.newsletterWelcome);
  if (flag?.alreadySent) return false;
  const sent = await sendLifecycleEmail("welcome_newsletter", email);
  if (sent) await writeFlag(customerId, FLAG.newsletterWelcome);
  return sent;
}

/** Existing customer? Flip their email consent to SUBSCRIBED, then welcome them
 *  if they've never been welcomed. Best-effort: any failure here just means we
 *  couldn't re-subscribe someone who already exists, which is a soft outcome,
 *  not an error worth surfacing to the visitor. */
async function resubscribeExisting(email: string): Promise<boolean> {
  const id = await findCustomerIdByEmail(email);
  if (!id) return false;
  const ok = await setEmailConsent(id, "SUBSCRIBED");
  if (ok) await welcomeOnce(id, email);
  return ok;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  // Strict: reject a missing/foreign Origin. This endpoint is unauthenticated,
  // so it can't lean on SameSite=Lax the way the cookie-bearing POSTs do.
  if (!isStrictSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  // Honeypot: a hidden field real visitors never fill. If it arrives populated,
  // it's a bot — return a plausible success and do nothing, so we neither create
  // a record, send an email, nor reveal that we saw the trap.
  const honeypot = typeof req.body?.contact_reason === "string" ? req.body.contact_reason.trim() : "";
  if (honeypot) {
    res.status(200).json({ ok: true });
    return;
  }

  // Best-effort throttle (per warm instance — see ratelimit.ts caveat): a burst
  // of signups from one IP is either abuse or a bug, so cap it.
  if (!allow(`subscribe:${clientIp(req)}`, 5, 60_000)) {
    res.status(429).json({ ok: false, error: "rate_limited" });
    return;
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ ok: false, error: "invalid_email" });
    return;
  }
  if (!isAdminConfigured()) {
    res.status(500).json({ ok: false, error: "newsletter_not_configured" });
    return;
  }

  try {
    const created = await adminGraphql(CUSTOMER_CREATE, {
      input: {
        email,
        emailMarketingConsent: {
          marketingState: "SUBSCRIBED",
          marketingOptInLevel: "SINGLE_OPT_IN",
        },
      },
    });
    const json = (await created.json()) as {
      data?: { customerCreate?: { customer?: { id: string } | null; userErrors?: UserError[] } };
    };
    const userErrors = json.data?.customerCreate?.userErrors ?? [];
    const customer = json.data?.customerCreate?.customer;

    if (customer) {
      /* Awaited, not fired-and-forgotten: a serverless function is frozen the
         instant it responds, so a dangling promise would be killed mid-send. */
      await welcomeOnce(customer.id, email);
      res.status(200).json({ ok: true });
      return;
    }

    // Already a customer → re-subscribe them instead of failing. Shopify phrases
    // this as "Email has already been taken" / "has already been taken".
    const taken = userErrors.some((e) => /has already been taken/i.test(e.message));
    if (taken) {
      const ok = await resubscribeExisting(email);
      // Even if the consent update couldn't run, the address is on file — treat
      // the visitor's intent as satisfied rather than showing them an error.
      // (The customer search index lags ~30–60s, so an address created moments
      // ago genuinely won't be found here. Expected, not a bug — no retries.)
      res.status(200).json({ ok: true, already: true, resubscribed: ok });
      return;
    }

    res.status(502).json({ ok: false, userErrors });
  } catch {
    res.status(502).json({ ok: false, error: "upstream_error" });
  }
}
