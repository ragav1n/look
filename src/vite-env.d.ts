/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** myshopify domain, e.g. "look-store.myshopify.com" (Headless sales channel) */
  readonly VITE_SHOPIFY_STORE_DOMAIN?: string;
  /** Storefront API public access token (safe to expose client-side) */
  readonly VITE_SHOPIFY_STOREFRONT_TOKEN?: string;
  /** Storefront API version, e.g. "2025-01". Optional — defaults in client.ts */
  readonly VITE_SHOPIFY_API_VERSION?: string;
  /**
   * "true" turns on real Customer Account API auth via the /api BFF. Unset (the
   * default) uses the dev fixture auth so the account UI works with no backend.
   */
  readonly VITE_CUSTOMER_AUTH_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
