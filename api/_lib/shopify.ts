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

const shopDomain = env("SHOPIFY_SHOP_DOMAIN")
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");
const apiVersion = env("SHOPIFY_CUSTOMER_API_VERSION") || "2025-01";
const appOrigin = (env("APP_ORIGIN") || "http://localhost:3000").replace(/\/+$/, "");

export const config = {
  shopDomain,
  apiVersion,
  clientId: env("SHOPIFY_CUSTOMER_CLIENT_ID"),
  clientSecret: env("SHOPIFY_CUSTOMER_CLIENT_SECRET"),
  storefrontToken: env("SHOPIFY_STOREFRONT_TOKEN"),
  appOrigin,
  cookieSecret: env("COOKIE_SECRET") || "dev-insecure-cookie-secret-change-me",
  secureCookies: appOrigin.startsWith("https"),
  /** OAuth scopes: OpenID identity + full Customer Account GraphQL access. */
  scope: env("SHOPIFY_CUSTOMER_SCOPE") || "openid email https://api.customers.com/auth/customer.graphql",
  redirectUri: `${appOrigin}/api/auth/callback`,
  storefrontApiVersion: env("VITE_SHOPIFY_API_VERSION") || "2025-01",
};

/** Throw a descriptive error if the pieces the BFF needs aren't configured.
 *  Handlers catch this and return a 500 with the message. */
export function assertConfig(): void {
  const missing = (
    [
      ["SHOPIFY_SHOP_DOMAIN", config.shopDomain],
      ["SHOPIFY_CUSTOMER_CLIENT_ID", config.clientId],
      ["SHOPIFY_CUSTOMER_CLIENT_SECRET", config.clientSecret],
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

function templates(): Endpoints {
  return {
    authorize: `https://${shopDomain}/authentication/oauth/authorize`,
    token: `https://${shopDomain}/authentication/oauth/token`,
    logout: `https://${shopDomain}/authentication/logout`,
    graphql: `https://${shopDomain}/customer/api/${apiVersion}/graphql`,
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
