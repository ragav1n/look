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

/** Run a Storefront GraphQL operation. Throws if Shopify isn't configured or
 *  the API returns errors — callers surface these as error states. */
export async function storefront<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  if (!isShopifyConfigured) {
    throw new Error(
      "Shopify Storefront API is not configured. Set VITE_SHOPIFY_STORE_DOMAIN and VITE_SHOPIFY_STOREFRONT_TOKEN.",
    );
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Shopify-Storefront-Access-Token": token as string,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Shopify Storefront API HTTP ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) throw new Error("Shopify Storefront API returned no data.");
  return json.data;
}
