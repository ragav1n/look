import { next } from "@vercel/edge";

/**
 * What crawlers need and a client-rendered SPA cannot give them.
 *
 * The site is a client-rendered SPA behind a catch-all rewrite, so every URL
 * serves the same index.html. A crawler never runs the app's JavaScript, so
 * two things have to be answered at the edge, before that rewrite:
 *
 *   /shop/<handle>  link previews. Sharing a product landed the generic site
 *                   card in WhatsApp instead of the piece being shared, so for
 *                   crawler requests this fetches the product and serves the
 *                   real index.html with its Open Graph block swapped for that
 *                   product's title, description, price and photo. Ordinary
 *                   visitors are passed straight through — they run the app,
 *                   which sets up the page itself, and adding a Shopify round
 *                   trip to their first byte would buy them nothing.
 *
 *   /sitemap.xml    the catalogue, listed. Nothing on the site links to every
 *                   product, so a crawler that has not already seen a handle
 *                   has no way to reach it.
 *
 * Both are fail-open: any error, timeout or miss falls back to next() (or, for
 * the sitemap, to the static routes alone), never to an error page.
 *
 * This lives in middleware rather than api/ because Vercel's plan caps the
 * project at 12 serverless functions and api/ is at 12.
 */

export const config = { matcher: ["/shop/:path*", "/sitemap.xml"] };

/* Preview bots plus the search crawlers, which get the same document either
   way — only the meta tags differ, and they describe the page accurately. */
const CRAWLER =
  /(facebookexternalhit|facebookcatalog|whatsapp|twitterbot|slackbot|slack-imgproxy|linkedinbot|telegrambot|discordbot|pinterest|redditbot|skypeuripreview|embedly|quora link preview|bitlybot|vkshare|iframely|googlebot|bingbot|applebot|instagram|line-poker|nuzzel|outbrain|w3c_validator)/i;

/** Shopify's own limit for a preview image is generous; 1200 is the OG norm. */
const OG_IMAGE_WIDTH = 1200;

/** A slow store must not hold a crawler open — WhatsApp gives up quickly. */
const FETCH_TIMEOUT_MS = 2500;

const env = (key: string) => process.env[key]?.trim() ?? "";

interface Product {
  title: string;
  description: string;
  /** Shopify's "Search engine listing" description, when the shop fills it. */
  seoDescription: string;
  productType: string;
  image?: { url: string; alt?: string };
  price?: { amount: string; currencyCode: string };
}

const PRODUCT_QUERY = `
  query ProductPreview($handle: String!, $width: Int!) {
    product(handle: $handle) {
      title
      description
      productType
      seo { description }
      images(first: 2) {
        nodes {
          url(transform: { maxWidth: $width })
          altText
        }
      }
      priceRange {
        minVariantPrice { amount currencyCode }
      }
    }
  }
`;

/** One Storefront round trip. Returns null on anything short of usable data. */
async function storefront<T>(
  query: string,
  variables: Record<string, unknown>,
  timeoutMs: number,
): Promise<T | null> {
  const domain = env("SHOPIFY_SHOP_DOMAIN") || env("VITE_SHOPIFY_STORE_DOMAIN");
  const token = env("SHOPIFY_STOREFRONT_TOKEN") || env("VITE_SHOPIFY_STOREFRONT_TOKEN");
  const version = env("VITE_SHOPIFY_API_VERSION") || "2025-01";
  if (!domain || !token) return null;

  const res = await fetch(`https://${domain}/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) return null;

  const json = (await res.json()) as { data?: T };
  return json.data ?? null;
}

export async function fetchProduct(handle: string): Promise<Product | null> {
  const data = await storefront<{
    product?: {
      title?: string;
      description?: string;
      productType?: string;
      seo?: { description?: string | null } | null;
      images?: { nodes?: { url?: string; altText?: string | null }[] } | null;
      priceRange?: { minVariantPrice?: { amount?: string; currencyCode?: string } };
    } | null;
  }>(PRODUCT_QUERY, { handle, width: OG_IMAGE_WIDTH }, FETCH_TIMEOUT_MS);

  const p = data?.product;
  if (!p?.title) return null;

  /* Second shot, not the first. A preview card is a wide band and these photos
     are tall, so clients centre-crop: on a distant full-length hero that leaves
     a strip of fabric with no bodice and no hem. Image two is the shot after
     the hero, which on this catalogue is framed closer and survives the crop.
     It is a rule of thumb, not a guarantee — where image two is a back view the
     card shows the back. The hero stays image one, where the shop grid wants
     it; that split is the whole reason the preview picks its own rather than
     the shop reordering media for both. */
  const shots = (p.images?.nodes ?? []).filter((n) => n.url);
  const shot = shots[1] ?? shots[0];

  const money = p.priceRange?.minVariantPrice;
  return {
    title: p.title,
    description: (p.description ?? "").trim(),
    seoDescription: (p.seo?.description ?? "").trim(),
    productType: (p.productType ?? "").trim(),
    image: shot?.url ? { url: shot.url, alt: shot.altText ?? p.title } : undefined,
    price:
      money?.amount && money.currencyCode
        ? { amount: money.amount, currencyCode: money.currencyCode }
        : undefined,
  };
}

/** Attribute-safe: these strings land inside double-quoted content="". */
const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * One tidy line under the photo: price, then the shop's own preview copy.
 *
 * It deliberately does NOT fall back to `description`. These products describe
 * themselves with a spec table (Feature / Details / Neckline / Closure …), and
 * flattened to one line that reads as scraped labels rather than a reason to
 * tap. Shopify's per-product "Search engine listing" description is the field
 * meant for this, so previews get better the moment the shop fills it in;
 * until then price and category say something true and short.
 */
function previewText(product: Product): string {
  const price =
    product.price &&
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: product.price.currencyCode,
      maximumFractionDigits: 0,
    }).format(Number(product.price.amount));

  const seo = product.seoDescription.replace(/\s+/g, " ").trim();
  const tail = seo
    ? seo.length > 160
      ? `${seo.slice(0, 157).trimEnd()}…`
      : seo
    : product.productType;

  return [price, tail].filter(Boolean).join(" · ") || "Modern western essentials from LOOK";
}

/** Swap the marked block in index.html for this product's tags. */
export function injectOg(html: string, product: Product, pageUrl: string): string {
  const title = `${product.title} — LOOK`;
  const description = previewText(product);
  const image = product.image?.url;

  const tags = [
    `<meta property="og:type" content="product" />`,
    `<meta property="og:site_name" content="LOOK" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(pageUrl)}" />`,
    image ? `<meta property="og:image" content="${esc(image)}" />` : "",
    image ? `<meta property="og:image:alt" content="${esc(product.image?.alt ?? title)}" />` : "",
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    image ? `<meta name="twitter:image" content="${esc(image)}" />` : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  return html
    .replace(/<!--og:start-->[\s\S]*?<!--og:end-->/, `<!--og:start-->\n    ${tags}\n    <!--og:end-->`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${esc(description)}" />`,
    );
}

/* ------------------------------------------------------------------ sitemap */

/** Google is patient in a way WhatsApp is not, so this gets its own budget. */
const SITEMAP_TIMEOUT_MS = 8000;

/** 250 is the Storefront page cap; four pages is far past this catalogue. */
const SITEMAP_PAGE_SIZE = 250;
const SITEMAP_MAX_PAGES = 4;

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

const SITEMAP_QUERY = `
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

interface SitemapProduct {
  handle: string;
  updatedAt: string;
  image?: string;
}

/* Annotated rather than inferred, and read back through the annotation below:
   `cursor` is assigned from endCursor and passed to the call that produces it,
   which is a cycle TypeScript cannot infer its way out of. */
interface SitemapPageInfo {
  hasNextPage?: boolean;
  endCursor?: string | null;
}

interface SitemapPage {
  products?: {
    pageInfo?: SitemapPageInfo;
    nodes?: { handle?: string; updatedAt?: string; featuredImage?: { url?: string } | null }[];
  } | null;
}

/** Every product published to this sales channel, oldest cursor first. */
async function fetchSitemapProducts(): Promise<SitemapProduct[]> {
  const products: SitemapProduct[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < SITEMAP_MAX_PAGES; page++) {
    const data: SitemapPage | null = await storefront<SitemapPage>(
      SITEMAP_QUERY,
      { first: SITEMAP_PAGE_SIZE, cursor },
      SITEMAP_TIMEOUT_MS,
    );

    const nodes = data?.products?.nodes;
    if (!nodes) break;

    for (const n of nodes) {
      if (!n.handle) continue;
      products.push({
        handle: n.handle,
        updatedAt: n.updatedAt ?? "",
        image: n.featuredImage?.url ?? undefined,
      });
    }

    const info: SitemapPageInfo | undefined = data?.products?.pageInfo;
    if (!info?.hasNextPage || !info.endCursor) break;
    cursor = info.endCursor;
  }

  return products;
}

/** One <url> entry. `esc` is doing XML duty here — its five replacements are
 *  exactly the predefined entities, and Shopify's CDN URLs carry the `&` that
 *  makes escaping mandatory rather than decorative. */
function urlEntry(loc: string, lastmod?: string, image?: string): string {
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

/**
 * The sitemap document.
 *
 * `origin` comes from the request rather than a constant so the file always
 * lists URLs on the host that served it — the spec's rule, and it keeps a
 * preview deployment's sitemap pointing at itself instead of at production.
 *
 * No <changefreq> or <priority>: Google ignores both, and has said so.
 */
function buildSitemap(origin: string, products: SitemapProduct[]): string {
  const newest = products
    .map((p) => p.updatedAt)
    .filter(Boolean)
    .sort()
    .pop();

  const entries = [
    ...STATIC_PATHS.map((path) =>
      urlEntry(`${origin}${path}`, CATALOGUE_PATHS.has(path) ? newest : undefined),
    ),
    ...products.map((p) =>
      urlEntry(
        `${origin}/shop/${encodeURIComponent(p.handle)}`,
        p.updatedAt || undefined,
        p.image,
      ),
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

async function serveSitemap(origin: string): Promise<Response> {
  /* A Shopify outage should cost the product URLs, not the whole file: the
     static routes are known without asking anyone, and a sitemap listing eight
     real pages beats a 500 that Search Console reports as an error. */
  let products: SitemapProduct[] = [];
  try {
    products = await fetchSitemapProducts();
  } catch {
    products = [];
  }

  return new Response(buildSitemap(origin, products), {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

/* --------------------------------------------------------------- dispatch */

export default async function middleware(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);

    // Served to anyone who asks, crawler or not — it is a public document.
    if (url.pathname === "/sitemap.xml") return serveSitemap(url.origin);

    const ua = request.headers.get("user-agent") ?? "";
    if (!CRAWLER.test(ua)) return next();

    // "/shop/<handle>" and nothing deeper.
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 2 || parts[0] !== "shop") return next();

    const product = await fetchProduct(decodeURIComponent(parts[1]));
    if (!product) return next();

    const shell = await fetch(new URL("/index.html", url), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!shell.ok) return next();

    // Canonical, so a link shared with ?utm_… still declares the clean URL.
    const html = injectOg(await shell.text(), product, `${url.origin}${url.pathname}`);

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Crawlers re-fetch on every share; let the edge answer most of them.
        "cache-control": "public, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  } catch {
    // A broken preview is a bad day; a broken product page is a lost sale.
    return next();
  }
}
