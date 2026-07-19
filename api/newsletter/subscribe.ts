/**
 * POST /api/newsletter/subscribe   body: { email }
 * Marks an email as SUBSCRIBED to email marketing on the Shopify store, so the
 * "Welcome new subscribers" automation (Shopify Email) picks them up.
 *
 * Uses the SERVER-ONLY Admin API token (config.adminToken) — it can create
 * customers, so it must never reach the browser. This is the newsletter twin of
 * api/cart/link.ts: same-origin guarded, best-effort, JSON in/out.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isSameOrigin, methodNotAllowed } from "../_lib/http.js";
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

const CUSTOMER_SEARCH = /* GraphQL */ `
  query NewsletterFind($query: String!) {
    customers(first: 1, query: $query) {
      edges { node { id } }
    }
  }
`;

const CONSENT_UPDATE = /* GraphQL */ `
  mutation NewsletterConsent($input: CustomerEmailMarketingConsentUpdateInput!) {
    customerEmailMarketingConsentUpdate(input: $input) {
      customer { id }
      userErrors { field message }
    }
  }
`;

interface UserError {
  field?: string[] | null;
  message: string;
}

/** Existing customer? Flip their email consent to SUBSCRIBED. Best-effort: any
 *  failure here just means we couldn't re-subscribe someone who already exists,
 *  which is a soft outcome, not an error worth surfacing to the visitor. */
async function resubscribeExisting(email: string): Promise<boolean> {
  const found = await adminGraphql(CUSTOMER_SEARCH, {
    // Quote the email so an address with a "-" isn't parsed as a search operator.
    query: `email:"${email.replace(/"/g, '\\"')}"`,
  });
  const foundJson = (await found.json()) as {
    data?: { customers?: { edges?: { node: { id: string } }[] } };
  };
  const id = foundJson.data?.customers?.edges?.[0]?.node.id;
  if (!id) return false;

  const updated = await adminGraphql(CONSENT_UPDATE, {
    input: {
      customerId: id,
      emailMarketingConsent: {
        marketingState: "SUBSCRIBED",
        marketingOptInLevel: "SINGLE_OPT_IN",
      },
    },
  });
  const updatedJson = (await updated.json()) as {
    data?: { customerEmailMarketingConsentUpdate?: { userErrors?: UserError[] } };
  };
  return (updatedJson.data?.customerEmailMarketingConsentUpdate?.userErrors ?? []).length === 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
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

    if (json.data?.customerCreate?.customer) {
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
      res.status(200).json({ ok: true, already: true, resubscribed: ok });
      return;
    }

    res.status(502).json({ ok: false, userErrors });
  } catch {
    res.status(502).json({ ok: false, error: "upstream_error" });
  }
}
