/**
 * One-off backfill: subscribe existing customers who were never asked.
 *
 * New customers now arrive subscribed from all three doors — the newsletter
 * form, the pre-selected checkout opt-in, and the sign-in hook in
 * api/account/index.ts. Everyone who created an account or ordered before that
 * is still sitting off the list. This walks them and flips their consent.
 *
 * ⚠️ These people never ticked a box, so treat this as a one-time, deliberate
 * action, not a routine job. It is the highest-complaint-risk thing we send:
 * run it once, watch the first drop email's complaint rate, and remember that
 * spam reports hurt the sending domain for months. Every email we send carries
 * a one-click unsubscribe (api/_lib/email/unsubscribe.ts), which is what makes
 * this defensible at all.
 *
 * Anyone who explicitly opted out (UNSUBSCRIBED) is skipped — a backfill must
 * never resurrect an opt-out. Same for customers with no email on file.
 *
 * Usage:
 *   node --env-file=.env scripts/backfill-marketing-consent.mjs            # dry run
 *   node --env-file=.env scripts/backfill-marketing-consent.mjs --apply
 *   node --env-file=.env scripts/backfill-marketing-consent.mjs --apply --limit 25
 *
 * Env (same names the functions use):
 *   SHOPIFY_ADMIN_TOKEN                            static token, or
 *   SHOPIFY_ADMIN_CLIENT_ID + SHOPIFY_ADMIN_CLIENT_SECRET   client-credentials pair
 *   SHOPIFY_SHOP_DOMAIN (or VITE_SHOPIFY_STORE_DOMAIN)
 *   SHOPIFY_ADMIN_API_VERSION                      optional, defaults to 2025-07
 */

const env = (k) => process.env[k]?.trim() || "";

const shopDomain = (env("SHOPIFY_SHOP_DOMAIN") || env("VITE_SHOPIFY_STORE_DOMAIN"))
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");
const apiVersion = env("SHOPIFY_ADMIN_API_VERSION") || "2025-07";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const limitArg = args.indexOf("--limit");
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;

if (!shopDomain) {
  console.error("Set SHOPIFY_SHOP_DOMAIN (or VITE_SHOPIFY_STORE_DOMAIN).");
  process.exit(1);
}
if (Number.isNaN(limit) || limit <= 0) {
  console.error("--limit needs a positive number.");
  process.exit(1);
}

/* --- Admin API ------------------------------------------------------------ */

/** Static token if there is one, otherwise the client-credentials grant — the
 *  same two paths api/_lib/shopify.ts supports. */
async function accessToken() {
  const static_ = env("SHOPIFY_ADMIN_TOKEN");
  if (static_) return static_;

  const client_id = env("SHOPIFY_ADMIN_CLIENT_ID");
  const client_secret = env("SHOPIFY_ADMIN_CLIENT_SECRET");
  if (!client_id || !client_secret) {
    console.error("Set SHOPIFY_ADMIN_TOKEN, or SHOPIFY_ADMIN_CLIENT_ID + SHOPIFY_ADMIN_CLIENT_SECRET.");
    process.exit(1);
  }
  const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ grant_type: "client_credentials", client_id, client_secret }),
  });
  if (!res.ok) throw new Error(`token exchange failed: HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (!json.access_token) throw new Error("token exchange returned no access_token");
  return json.access_token;
}

let token = "";

async function graphql(query, variables) {
  const res = await fetch(`https://${shopDomain}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data;
}

/* --- Queries -------------------------------------------------------------- */

/* `accepts_marketing:false` is the filter that works; there is no
   email_marketing_state search field (see api/_lib/audience.ts). The state is
   read off each node instead, which is what lets us tell "never asked" apart
   from "said no". */
const CANDIDATES = /* GraphQL */ `
  query BackfillCandidates($cursor: String) {
    customers(first: 250, after: $cursor, query: "accepts_marketing:false") {
      edges {
        node {
          id
          email
          emailMarketingConsent { marketingState }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const CONSENT_UPDATE = /* GraphQL */ `
  mutation BackfillConsent($input: CustomerEmailMarketingConsentUpdateInput!) {
    customerEmailMarketingConsentUpdate(input: $input) {
      userErrors { field message }
    }
  }
`;

const mask = (email) => {
  const at = email.indexOf("@");
  return at < 1 ? email : `${email[0]}***${email.slice(at)}`;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* --- Run ------------------------------------------------------------------ */

async function main() {
  token = await accessToken();

  const candidates = [];
  const skipped = { unsubscribed: 0, noEmail: 0, other: 0 };
  let cursor = null;

  // Bounded like listSubscribers(): 40 pages = 10,000 customers.
  for (let page = 0; page < 40; page++) {
    const data = await graphql(CANDIDATES, { cursor });
    for (const { node } of data.customers.edges) {
      const state = node.emailMarketingConsent?.marketingState ?? "NOT_SUBSCRIBED";
      if (!node.email) skipped.noEmail++;
      else if (state === "UNSUBSCRIBED") skipped.unsubscribed++;
      else if (state !== "NOT_SUBSCRIBED" && state !== "PENDING") skipped.other++;
      else candidates.push({ id: node.id, email: node.email });
    }
    const info = data.customers.pageInfo;
    if (!info.hasNextPage) break;
    cursor = info.endCursor;
  }

  const targets = candidates.slice(0, limit === Infinity ? undefined : limit);

  console.log(`\n  ${shopDomain} · Admin ${apiVersion}`);
  console.log(`  candidates:  ${candidates.length}`);
  console.log(`  skipped:     ${skipped.unsubscribed} opted out · ${skipped.noEmail} no email · ${skipped.other} other`);
  console.log(`  will update: ${targets.length}${apply ? "" : "  (dry run)"}\n`);
  for (const c of targets.slice(0, 20)) console.log(`    ${mask(c.email)}`);
  if (targets.length > 20) console.log(`    …and ${targets.length - 20} more`);

  if (!apply) {
    console.log("\n  Dry run. Re-run with --apply to write these.\n");
    return;
  }

  let ok = 0;
  const failures = [];
  for (const c of targets) {
    try {
      const data = await graphql(CONSENT_UPDATE, {
        input: {
          customerId: c.id,
          emailMarketingConsent: {
            marketingState: "SUBSCRIBED",
            marketingOptInLevel: "SINGLE_OPT_IN",
          },
        },
      });
      const errs = data.customerEmailMarketingConsentUpdate?.userErrors ?? [];
      if (errs.length) failures.push(`${mask(c.email)}: ${errs.map((e) => e.message).join("; ")}`);
      else ok++;
    } catch (err) {
      failures.push(`${mask(c.email)}: ${err.message}`);
    }
    // Admin GraphQL leaks its cost bucket back at ~50 points/sec and this
    // mutation costs 10, so stay well under with a quarter-second gap.
    await sleep(250);
  }

  console.log(`\n  subscribed: ${ok}`);
  if (failures.length) {
    console.log(`  failed:     ${failures.length}`);
    for (const f of failures.slice(0, 20)) console.log(`    ${f}`);
  }
  console.log("");
}

main().catch((err) => {
  console.error(`\n  ${err.message}\n`);
  process.exit(1);
});
