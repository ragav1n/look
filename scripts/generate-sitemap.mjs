/**
 * Writes public/sitemap.xml from the live catalogue, at build time.
 *
 * The site is a client-rendered SPA, so nothing a crawler can read links to a
 * product. Without this file Google has no route into /shop/<handle> at all.
 *
 * This began as an edge-middleware route, which had the nicer property of
 * regenerating per request. It moved here because Vercel's edge drops the
 * content-type header from HEAD responses it serves — every static path on the
 * site returns one, a middleware path returns none — and with
 * X-Content-Type-Options: nosniff set, a fetcher that probes with HEAD before
 * GET sees a typeless body it is not permitted to sniff. Google's sitemap
 * fetcher reported "Couldn't fetch" against the middleware route while its own
 * URL Inspection (a plain GET) fetched the identical bytes happily. A real file
 * in public/ is served by the static path, which sets the header correctly.
 *
 * The cost is freshness: this runs per deploy, not per request, so a product
 * added in Shopify reaches the sitemap on the next build. A Shopify
 * products/create webhook pointed at a Vercel deploy hook would close that gap
 * without any code.
 *
 * Never fails the build. No credentials or a Shopify outage yields the static
 * routes alone — a short sitemap beats a broken deploy.
 *
 * Run: node scripts/generate-sitemap.mjs   (invoked by `npm run build`)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "public/sitemap.xml");

const ORIGIN = "https://look.ind.in";
const PAGE_SIZE = 250;
const MAX_PAGES = 4;
const TIMEOUT_MS = 10000;

/**
 * The public routes with no data behind them.
 *
 * Deliberately absent: /cart and /account/* are personal and empty to a
 * crawler, /login and /signup are dead ends, /admin is robots-disallowed.
 * Listing any of them asks Google to index a page worth nothing in a result.
 */
const STATIC_PATHS = [
  "/",
  "/shop",
  "/about",
  "/support",
  "/shipping",
  "/returns",
  "/privacy",
  "/terms",
];

/** The two pages that are windows onto the catalogue, so the catalogue's
 *  freshness is honestly theirs. Every other static path gets no lastmod —
 *  Google would rather have none than one it learns to distrust. */
const CATALOGUE_PATHS = new Set(["/", "/shop"]);

/** Minimal .env loader, matching scripts/dev-local.mjs. Vercel's build already
 *  has these in the environment; this is for building locally. */
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

const env = (key) => process.env[key]?.trim() ?? "";

const PRODUCTS_QUERY = `
  query SitemapProducts($first: Int!, $cursor: String) {
    products(first: $first, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        handle
        updatedAt
        featuredImage { url }
      }
    }
  }
`;

async function fetchProducts() {
  const domain = env("SHOPIFY_SHOP_DOMAIN") || env("VITE_SHOPIFY_STORE_DOMAIN");
  const token = env("SHOPIFY_STOREFRONT_TOKEN") || env("VITE_SHOPIFY_STOREFRONT_TOKEN");
  const version = env("VITE_SHOPIFY_API_VERSION") || "2025-01";
  if (!domain || !token) {
    console.warn("[sitemap] no Shopify credentials — writing static routes only");
    return [];
  }

  const products = [];
  let cursor = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(`https://${domain}/api/${version}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token,
      },
      body: JSON.stringify({
        query: PRODUCTS_QUERY,
        variables: { first: PAGE_SIZE, cursor },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Storefront API ${res.status}`);

    const { data } = await res.json();
    const nodes = data?.products?.nodes;
    if (!nodes) break;

    for (const node of nodes) {
      if (!node.handle) continue;
      products.push({
        handle: node.handle,
        updatedAt: node.updatedAt ?? "",
        image: node.featuredImage?.url ?? "",
      });
    }

    const info = data?.products?.pageInfo;
    if (!info?.hasNextPage || !info.endCursor) break;
    cursor = info.endCursor;
  }

  return products;
}

/** The five predefined XML entities. Shopify's CDN URLs carry the `&` that
 *  makes this mandatory rather than decorative. */
const esc = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function urlEntry(loc, lastmod, image) {
  return [
    "  <url>",
    `    <loc>${esc(loc)}</loc>`,
    lastmod ? `    <lastmod>${esc(lastmod)}</lastmod>` : "",
    image ? `    <image:image><image:loc>${esc(image)}</image:loc></image:image>` : "",
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

/** No <changefreq> or <priority>: Google ignores both, and has said so. */
function buildSitemap(products) {
  const newest = products
    .map((p) => p.updatedAt)
    .filter(Boolean)
    .sort()
    .pop();

  const entries = [
    ...STATIC_PATHS.map((path) =>
      urlEntry(`${ORIGIN}${path}`, CATALOGUE_PATHS.has(path) ? newest : "", ""),
    ),
    ...products.map((p) =>
      urlEntry(`${ORIGIN}/shop/${encodeURIComponent(p.handle)}`, p.updatedAt, p.image),
    ),
  ];

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    ...entries,
    `</urlset>`,
    "",
  ].join("\n");
}

loadEnv();

let products = [];
try {
  products = await fetchProducts();
} catch (error) {
  console.warn(`[sitemap] catalogue unavailable (${error.message}) — static routes only`);
}

writeFileSync(OUT, buildSitemap(products), "utf8");
console.log(
  `[sitemap] wrote public/sitemap.xml — ${STATIC_PATHS.length} routes + ${products.length} products`,
);
