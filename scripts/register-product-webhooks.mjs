/**
 * Points Shopify's product webhooks at a Vercel deploy hook.
 *
 * public/sitemap.xml is written at build time (scripts/generate-sitemap.mjs),
 * so a product the shop adds is missing from it until the next deploy — and
 * since the storefront is a client-rendered SPA, the sitemap is the only route
 * a crawler has to a product page. These webhooks close that gap: Shopify calls
 * the deploy hook, Vercel rebuilds, the sitemap picks the product up.
 *
 * Subscribed topics:
 *   PRODUCTS_CREATE — a new product should reach the sitemap promptly.
 *   PRODUCTS_DELETE — a removed one should leave it.
 *
 * PRODUCTS_UPDATE is deliberately NOT subscribed. Shopify fires it on every
 * inventory movement, so every order placed would trigger a production deploy.
 * The gap this leaves: a product created as a draft and published later fires
 * only UPDATE, so it waits for the next deploy. Publishing at creation avoids
 * it entirely.
 *
 * No loop risk: a deploy does not touch the catalogue, so it cannot re-fire.
 *
 * Idempotent — reconciles to the URL in DEPLOY_HOOK_URL, creating what is
 * missing and repointing anything stale. Safe to re-run.
 *
 * Run:  DEPLOY_HOOK_URL='https://api.vercel.com/v1/integrations/deploy/…' \
 *         node scripts/register-product-webhooks.mjs
 *       (or put DEPLOY_HOOK_URL in .env and run it bare)
 *
 *       node scripts/register-product-webhooks.mjs --list    # show, change nothing
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOPICS = ["PRODUCTS_CREATE", "PRODUCTS_DELETE"];

function loadEnv() {
  const path = resolve(ROOT, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^["']|["']$/g, "");
    if (!(match[1] in process.env)) process.env[match[1]] = value;
  }
}

loadEnv();

const env = (key) => process.env[key]?.trim() ?? "";
const shopDomain = env("SHOPIFY_SHOP_DOMAIN") || env("VITE_SHOPIFY_STORE_DOMAIN");
const apiVersion = env("SHOPIFY_ADMIN_API_VERSION") || "2025-07";

/** Static token or the client_credentials grant — the same two paths
 *  api/_lib/shopify.ts supports, matching scripts/backfill-marketing-consent.mjs. */
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

const token = await accessToken();

async function adminGraphql(query, variables) {
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
  return res.json();
}

const LIST = `
  query {
    webhookSubscriptions(first: 50) {
      nodes {
        id
        topic
        endpoint { ... on WebhookHttpEndpoint { callbackUrl } }
      }
    }
  }
`;

const CREATE = `
  mutation Create($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) {
      webhookSubscription { id }
      userErrors { field message }
    }
  }
`;

const UPDATE = `
  mutation Update($id: ID!, $sub: WebhookSubscriptionInput!) {
    webhookSubscriptionUpdate(id: $id, webhookSubscription: $sub) {
      webhookSubscription { id }
      userErrors { field message }
    }
  }
`;

/** Throws on transport errors, GraphQL errors, or userErrors — a half-wired
 *  set of webhooks is worse than a visible failure. */
async function call(query, variables, path) {
  const res = await adminGraphql(query, variables);
  if (res?.errors) throw new Error(JSON.stringify(res.errors));
  const payload = path ? res?.data?.[path] : null;
  if (payload?.userErrors?.length) throw new Error(JSON.stringify(payload.userErrors));
  return res?.data;
}

async function listSubscriptions() {
  const data = await call(LIST, {});
  return data?.webhookSubscriptions?.nodes ?? [];
}

const existing = await listSubscriptions();

if (process.argv.includes("--list")) {
  console.log(`${existing.length} webhook subscription(s):`);
  for (const node of existing) {
    console.log(`  ${node.topic} → ${node.endpoint?.callbackUrl ?? "(non-HTTP endpoint)"}`);
  }
  process.exit(0);
}

const url = (process.env.DEPLOY_HOOK_URL ?? "").trim();
if (!url) {
  console.error(
    "DEPLOY_HOOK_URL is not set.\n" +
      "Create one at Vercel → Project → Settings → Git → Deploy Hooks,\n" +
      "then put it in .env as DEPLOY_HOOK_URL= and re-run.",
  );
  process.exit(1);
}
if (!url.startsWith("https://")) {
  console.error("DEPLOY_HOOK_URL must be https — Shopify refuses anything else.");
  process.exit(1);
}

for (const topic of TOPICS) {
  const current = existing.find((node) => node.topic === topic);

  if (!current) {
    await call(CREATE, { topic, sub: { callbackUrl: url, format: "JSON" } }, "webhookSubscriptionCreate");
    console.log(`created  ${topic}`);
  } else if (current.endpoint?.callbackUrl !== url) {
    await call(UPDATE, { id: current.id, sub: { callbackUrl: url } }, "webhookSubscriptionUpdate");
    console.log(`repointed ${topic}`);
  } else {
    console.log(`ok       ${topic} (already correct)`);
  }
}

console.log("\nRegistered:");
for (const node of await listSubscriptions()) {
  console.log(`  ${node.topic} → ${node.endpoint?.callbackUrl ?? "(non-HTTP endpoint)"}`);
}
