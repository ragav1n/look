/**
 * Minimal Shopify Storefront API (GraphQL) client.
 *
 * Configuration comes from Vite env vars (must be VITE_-prefixed to reach the
 * browser bundle). The Storefront access token is a *public* token and is safe
 * to expose client-side — that is by design for headless storefronts.
 *
 *   VITE_SHOPIFY_STORE_DOMAIN    e.g. "look-store.myshopify.com"
 *   VITE_SHOPIFY_STOREFRONT_TOKEN  Storefront API public access token
 *   VITE_SHOPIFY_API_VERSION     optional, defaults below
 *
 * When these are absent, `isShopifyConfigured` is false and the data layer
 * falls back to the dev fixtures (see src/lib/fixtures). The moment the env
 * vars are present, every query/mutation runs against the live store instead.
 */

const rawDomain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN?.trim();
const token = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN?.trim();
const apiVersion = import.meta.env.VITE_SHOPIFY_API_VERSION?.trim() || "2025-01";

const domain = rawDomain?.replace(/^https?:\/\//, "").replace(/\/+$/, "");

export const isShopifyConfigured = Boolean(domain && token);

const endpoint = domain ? `https://${domain}/api/${apiVersion}/graphql.json` : "";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/* A shared product link is usually opened in an in-app browser (WhatsApp,
   Instagram) on a phone, cold: fresh DNS + TLS + CORS preflight to the
   myshopify origin, often on patchy mobile data. One dropped request used to
   be the whole page ("CONNECTION PROBLEM"). Reads are idempotent, so they get
   a timeout and a couple of quick retries; mutations never retry, since a
   cart add that reached Shopify but lost its response would be applied twice. */
const TIMEOUT_MS = 12_000;
const RETRY_DELAYS_MS = [500, 1500];

/** Worth another go: the network itself failed (fetch threw, or our timeout
 *  fired), or Shopify answered with a throttle / bot-check / server error. */
class TransientError extends Error {}

const isMutation = (query: string) => /^\s*mutation\b/m.test(query);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function once<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Shopify-Storefront-Access-Token": token as string,
      },
      body: JSON.stringify({ query, variables }),
      signal: ctrl.signal,
    });
  } catch (err) {
    // iOS reports this as "TypeError: Load failed"; an abort is our timeout.
    throw new TransientError(`Storefront request failed: ${err instanceof Error ? err.message : err}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const msg = `Shopify Storefront API HTTP ${res.status}: ${await res.text().catch(() => "")}`;
    // 429 throttle, 430 Shopify's security rejection, 5xx outages.
    if (res.status === 429 || res.status === 430 || res.status >= 500) throw new TransientError(msg);
    throw new Error(msg);
  }

  let json: GraphQLResponse<T>;
  try {
    json = (await res.json()) as GraphQLResponse<T>;
  } catch {
    // A body cut off mid-stream on a dropping connection.
    throw new TransientError("Shopify Storefront API returned an unreadable body.");
  }
  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) throw new Error("Shopify Storefront API returned no data.");
  return json.data;
}

/** Run a Storefront GraphQL operation. Throws if Shopify isn't configured or
 *  the API returns errors — callers surface these as error states. Queries
 *  retry transient network failures; mutations run exactly once. */
export async function storefront<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  if (!isShopifyConfigured) {
    throw new Error(
      "Shopify Storefront API is not configured. Set VITE_SHOPIFY_STORE_DOMAIN and VITE_SHOPIFY_STOREFRONT_TOKEN.",
    );
  }

  const delays = isMutation(query) ? [] : RETRY_DELAYS_MS;
  for (let attempt = 0; ; attempt++) {
    try {
      return await once<T>(query, variables);
    } catch (err) {
      if (!(err instanceof TransientError) || attempt >= delays.length) throw err;
      await sleep(delays[attempt]);
    }
  }
}
