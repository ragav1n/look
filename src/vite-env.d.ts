/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** myshopify domain, e.g. "look-store.myshopify.com" (Headless sales channel) */
  readonly VITE_SHOPIFY_STORE_DOMAIN?: string;
  /** Storefront API public access token (safe to expose client-side) */
  readonly VITE_SHOPIFY_STOREFRONT_TOKEN?: string;
  /** Storefront API version, e.g. "2025-01". Optional — defaults in client.ts */
  readonly VITE_SHOPIFY_API_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
