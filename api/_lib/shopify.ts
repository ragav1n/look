/**
 * Server-side Shopify config + endpoint resolution for the auth BFF.
 *
 * Everything here reads SERVER-ONLY env vars (never VITE_-prefixed) so the
 * client secret and shop config never reach the browser bundle. Endpoints are
 * resolved from Shopify's discovery documents when reachable, with templated
 * fallbacks — this transparently handles both the `{domain}/authentication/...`
 * and `shopify.com/authentication/{shopId}/...` endpoint shapes.
 */

const env = (k: string) => process.env[k]?.trim() || "";

/* The shop domain and Storefront token are PUBLIC values the browser bundle
   already carries, so rather than duplicating them under a server-only name we
   fall back to the VITE_ ones (Vercel exposes every project env var to
   functions). A server-only override is still honoured if you set one. */
const shopDomain = (env("SHOPIFY_SHOP_DOMAIN") || env("VITE_SHOPIFY_STORE_DOMAIN"))
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");
/** Numeric shop id from the Headless channel's "Application endpoints" panel.
 *  New customer accounts serve auth from shopify.com/authentication/{shopId},
 *  so without this the templated fallbacks below point at the wrong host. */
const shopId = env("SHOPIFY_SHOP_ID");
const apiVersion = env("SHOPIFY_CUSTOMER_API_VERSION") || "2026-07";
const appOrigin = (env("APP_ORIGIN") || "http://localhost:3000").replace(/\/+$/, "");

export const config = {
  shopDomain,
  shopId,
  apiVersion,
  clientId: env("SHOPIFY_CUSTOMER_CLIENT_ID"),
  clientSecret: env("SHOPIFY_CUSTOMER_CLIENT_SECRET"),
  storefrontToken: env("SHOPIFY_STOREFRONT_TOKEN") || env("VITE_SHOPIFY_STOREFRONT_TOKEN"),
  /* Admin API access — SERVER-ONLY, never VITE_-prefixed. Can create/update
     customers, so it must never reach the browser bundle. Powers the newsletter
     subscribe endpoint. Two ways to configure it:
       - `SHOPIFY_ADMIN_TOKEN` — a static token (`shpat_…`), if you have one.
       - `SHOPIFY_ADMIN_CLIENT_ID` + `SHOPIFY_ADMIN_CLIENT_SECRET` — the modern
         Dev Dashboard path: the function exchanges these for a 24h token via the
         client_credentials grant and refreshes it automatically.
     Unset entirely (as in dev), the subscribe endpoint 500s and the SPA falls
     back to its dev-success path. */
  adminToken: env("SHOPIFY_ADMIN_TOKEN"),
  adminClientId: env("SHOPIFY_ADMIN_CLIENT_ID"),
  adminClientSecret: env("SHOPIFY_ADMIN_CLIENT_SECRET"),
  adminApiVersion: env("SHOPIFY_ADMIN_API_VERSION") || "2025-07",
  appOrigin,
  cookieSecret: env("COOKIE_SECRET") || "dev-insecure-cookie-secret-change-me",
  secureCookies: appOrigin.startsWith("https"),
  /** OAuth scopes. Must come from the store's `scopes_supported` — check
   *  /.well-known/openid-configuration; the URL-style customer.graphql scope is
   *  NOT accepted by new customer accounts. */
  scope: env("SHOPIFY_CUSTOMER_SCOPE") || "openid email customer-account-api:full",
  redirectUri: `${appOrigin}/api/auth/callback`,
  storefrontApiVersion: env("VITE_SHOPIFY_API_VERSION") || "2025-01",
};

/** Throw a descriptive error if the pieces the BFF needs aren't configured.
 *  Handlers catch this and return a 500 with the message. */
export function assertConfig(): void {
  /* The secret is deliberately NOT required: a Public client authenticates with
     PKCE alone. Confidential is preferred (the store advertises
     client_secret_basic), but we shouldn't hard-fail without one. */
  const missing = (
    [
      ["SHOPIFY_SHOP_DOMAIN", config.shopDomain],
      ["SHOPIFY_CUSTOMER_CLIENT_ID", config.clientId],
    ] as const
  )
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(`Customer Account API is not configured. Missing env: ${missing.join(", ")}`);
  }
}

export interface Endpoints {
  authorize: string;
  token: string;
  logout: string;
  graphql: string;
}

/* Fallbacks for when discovery is unreachable. With SHOPIFY_SHOP_ID set these
   match what the Headless channel shows verbatim; without it we can only guess
   the legacy shop-domain shape, which new customer accounts do NOT use. */
function templates(): Endpoints {
  const auth = shopId
    ? `https://shopify.com/authentication/${shopId}`
    : `https://${shopDomain}/authentication`;
  return {
    authorize: `${auth}/oauth/authorize`,
    token: `${auth}/oauth/token`,
    logout: `${auth}/logout`,
    graphql: shopId
      ? `https://shopify.com/${shopId}/account/customer/api/${apiVersion}/graphql`
      : `https://${shopDomain}/customer/api/${apiVersion}/graphql`,
  };
}

let cached: Endpoints | null = null;

/** Resolve endpoints via discovery, cached for the lifetime of the function
 *  instance. Falls back to templates if discovery is unreachable. */
export async function resolveEndpoints(): Promise<Endpoints> {
  if (cached) return cached;
  const fallback = templates();
  try {
    const [oidc, caa] = await Promise.all([
      fetch(`https://${shopDomain}/.well-known/openid-configuration`).then((r) =>
        r.ok ? (r.json() as Promise<Record<string, string>>) : null,
      ),
      fetch(`https://${shopDomain}/.well-known/customer-account-api`).then((r) =>
        r.ok ? (r.json() as Promise<Record<string, string>>) : null,
      ),
    ]);
    cached = {
      authorize: oidc?.authorization_endpoint || fallback.authorize,
      token: oidc?.token_endpoint || fallback.token,
      logout: oidc?.end_session_endpoint || oidc?.logout_endpoint || fallback.logout,
      graphql: caa?.graphql_api || caa?.customer_account_api_url || fallback.graphql,
    };
  } catch {
    cached = fallback;
  }
  return cached;
}

export const storefrontGraphqlUrl = () =>
  `https://${shopDomain}/api/${config.storefrontApiVersion}/graphql.json`;

export const adminGraphqlUrl = () =>
  `https://${shopDomain}/admin/api/${config.adminApiVersion}/graphql.json`;

/** True when the Admin API can be reached — either a static token or a
 *  client-credentials pair is configured. */
export const isAdminConfigured = (): boolean =>
  Boolean(config.adminToken || (config.adminClientId && config.adminClientSecret));

/* Cached client-credentials token, per function instance. Shopify's grant
   returns a ~24h token; we refresh a minute early to avoid using a stale one. */
let adminTokenCache: { token: string; expiresAt: number } | null = null;

/** Resolve an Admin API access token. Prefers a static `SHOPIFY_ADMIN_TOKEN`;
 *  otherwise exchanges the Dev Dashboard client id/secret via the
 *  client_credentials grant and caches the result until shortly before expiry. */
async function getAdminAccessToken(): Promise<string> {
  if (config.adminToken) return config.adminToken;
  if (!config.adminClientId || !config.adminClientSecret) {
    throw new Error("Admin API is not configured (need SHOPIFY_ADMIN_TOKEN or client id/secret).");
  }
  const now = Date.now();
  if (adminTokenCache && adminTokenCache.expiresAt > now) return adminTokenCache.token;

  const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: config.adminClientId,
      client_secret: config.adminClientSecret,
    }),
  });
  if (!res.ok) {
    throw new Error(`Admin token exchange failed: HTTP ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("Admin token exchange returned no access_token.");
  adminTokenCache = {
    token: json.access_token,
    expiresAt: now + (json.expires_in ?? 86_400) * 1000 - 60_000,
  };
  return json.access_token;
}

/** Run an Admin GraphQL operation with the server-only admin token. Returns the
 *  raw fetch Response so callers can read `data`/`userErrors` and status. */
export async function adminGraphql(
  query: string,
  variables?: Record<string, unknown>,
): Promise<Response> {
  const token = await getAdminAccessToken();
  return fetch(adminGraphqlUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
}
