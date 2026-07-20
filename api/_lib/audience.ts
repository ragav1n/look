/**
 * Admin-API operations on the marketing audience: who is subscribed, flipping
 * consent, and the once-only "we already emailed this person" flags.
 *
 * Not to be confused with ./customer.ts, which wraps the *Customer Account* API
 * (a signed-in shopper's own view). This module speaks to the *Admin* API with
 * the server-only token and can see every customer on the store.
 *
 * Shopify is the single source of truth for marketing consent. Our unsubscribe
 * link writes back here, so the campaigns the client sends by hand from Shopify
 * Messaging and the emails we send ourselves always share one list.
 */
import { adminGraphql } from "./shopify.js";

/** Namespace for our bookkeeping metafields. Deliberately NOT `custom`, which
 *  is the client's own space (hero_tagline and friends) — these are plumbing
 *  and shouldn't clutter it. */
const NS = "look_email";

interface UserError {
  field?: string[] | null;
  message: string;
}

const errorsOf = (payload: { userErrors?: UserError[] } | undefined): UserError[] =>
  payload?.userErrors ?? [];

/* --- Lookup --------------------------------------------------------------- */

const CUSTOMER_SEARCH = /* GraphQL */ `
  query AudienceFind($query: String!) {
    customers(first: 1, query: $query) {
      edges { node { id } }
    }
  }
`;

/**
 * Find a customer id by email, or null.
 *
 * ⚠️ Shopify's customer search index lags roughly 30–60s behind writes, so a
 * customer created moments ago will NOT be found here. That is expected — don't
 * "fix" it with retries. Callers that already hold an id (the account-welcome
 * endpoint reads it straight off the access token) should never come through
 * this function.
 */
export async function findCustomerIdByEmail(email: string): Promise<string | null> {
  // Quote the address so one containing "-" isn't parsed as a search operator.
  const res = await adminGraphql(CUSTOMER_SEARCH, {
    query: `email:"${email.replace(/"/g, '\\"')}"`,
  });
  const json = (await res.json()) as {
    data?: { customers?: { edges?: { node: { id: string } }[] } };
  };
  return json.data?.customers?.edges?.[0]?.node.id ?? null;
}

/* --- Consent -------------------------------------------------------------- */

const CONSENT_UPDATE = /* GraphQL */ `
  mutation AudienceConsent($input: CustomerEmailMarketingConsentUpdateInput!) {
    customerEmailMarketingConsentUpdate(input: $input) {
      customer { id }
      userErrors { field message }
    }
  }
`;

export type ConsentState = "SUBSCRIBED" | "UNSUBSCRIBED";

/** Set a customer's email-marketing consent. Returns false on any userError. */
export async function setEmailConsent(
  customerId: string,
  marketingState: ConsentState,
): Promise<boolean> {
  const res = await adminGraphql(CONSENT_UPDATE, {
    input: {
      customerId,
      emailMarketingConsent: {
        marketingState,
        // Only meaningful when opting in; Shopify ignores it on the way out.
        ...(marketingState === "SUBSCRIBED" ? { marketingOptInLevel: "SINGLE_OPT_IN" } : {}),
      },
    },
  });
  const json = (await res.json()) as {
    data?: { customerEmailMarketingConsentUpdate?: { userErrors?: UserError[] } };
  };
  const errs = errorsOf(json.data?.customerEmailMarketingConsentUpdate);
  if (errs.length) console.error("[audience] consent update:", errs.map((e) => e.message).join("; "));
  return errs.length === 0;
}

/* --- Once-only flags ------------------------------------------------------ */

const FLAG_READ = /* GraphQL */ `
  query AudienceFlag($id: ID!, $key: String!) {
    customer(id: $id) {
      email
      firstName
      metafield(namespace: "${NS}", key: $key) { value }
    }
  }
`;

const FLAG_WRITE = /* GraphQL */ `
  mutation AudienceFlagSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      userErrors { field message }
    }
  }
`;

export interface CustomerFlag {
  email: string;
  firstName: string;
  /** True when this email has already been sent to this customer. */
  alreadySent: boolean;
}

/** Read a customer's email + whether `key` has been marked. Null if the id is
 *  unknown to the store. */
export async function readFlag(customerId: string, key: string): Promise<CustomerFlag | null> {
  const res = await adminGraphql(FLAG_READ, { id: customerId, key });
  const json = (await res.json()) as {
    data?: {
      customer?: {
        email?: string | null;
        firstName?: string | null;
        metafield?: { value?: string | null } | null;
      } | null;
    };
  };
  const c = json.data?.customer;
  if (!c) return null;
  return {
    email: c.email ?? "",
    firstName: c.firstName ?? "",
    alreadySent: c.metafield?.value === "true",
  };
}

/** Mark `key` as done for this customer. Best-effort: a failure here means a
 *  duplicate email is possible later, which is better than failing the request. */
export async function writeFlag(customerId: string, key: string): Promise<void> {
  const res = await adminGraphql(FLAG_WRITE, {
    metafields: [{ ownerId: customerId, namespace: NS, key, type: "boolean", value: "true" }],
  });
  const json = (await res.json()) as {
    data?: { metafieldsSet?: { userErrors?: UserError[] } };
  };
  const errs = errorsOf(json.data?.metafieldsSet);
  if (errs.length) console.error("[audience] flag write:", errs.map((e) => e.message).join("; "));
}

export const FLAG = {
  newsletterWelcome: "newsletter_welcome_sent",
  accountWelcome: "account_welcome_sent",
} as const;

/* --- The subscriber list -------------------------------------------------- */

const SUBSCRIBERS = /* GraphQL */ `
  query AudienceSubscribers($cursor: String) {
    customers(first: 250, after: $cursor, query: "accepts_marketing:true") {
      edges { node { id email firstName } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export interface Subscriber {
  id: string;
  email: string;
  firstName: string;
}

/**
 * Every customer consenting to email marketing, paged out in full.
 *
 * `accepts_marketing:true` is the filter that works — there is no
 * `email_marketing_state` search field on the customers query, despite the
 * enum of that name existing on the Customer object. Verified against the live
 * store before this was written.
 */
export async function listSubscribers(): Promise<Subscriber[]> {
  const out: Subscriber[] = [];
  let cursor: string | null = null;

  // Bounded so a pagination bug can't spin forever: 40 pages = 10,000 customers.
  for (let page = 0; page < 40; page++) {
    const res = await adminGraphql(SUBSCRIBERS, { cursor });
    const json = (await res.json()) as {
      data?: {
        customers?: {
          edges?: { node: Subscriber }[];
          pageInfo?: { hasNextPage?: boolean; endCursor?: string };
        };
      };
      errors?: { message: string }[];
    };
    if (json.errors?.length) {
      throw new Error(`subscriber lookup failed: ${json.errors.map((e) => e.message).join("; ")}`);
    }
    for (const e of json.data?.customers?.edges ?? []) {
      if (e.node.email) out.push(e.node);
    }
    const info = json.data?.customers?.pageInfo;
    if (!info?.hasNextPage || !info.endCursor) break;
    cursor = info.endCursor;
  }
  return out;
}
