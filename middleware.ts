import { next } from "@vercel/edge";

/**
 * Product link previews.
 *
 * The site is a client-rendered SPA behind a catch-all rewrite, so every URL
 * serves the same index.html. A link crawler never runs the app's JavaScript,
 * which is why sharing a product landed the generic site card in WhatsApp
 * instead of the piece being shared.
 *
 * For crawler requests to /shop/<handle> this fetches the product from the
 * Storefront API and serves the real index.html with its Open Graph block
 * swapped for that product's title, description, price and photo. Ordinary
 * visitors are passed straight through — they run the app, which sets up the
 * page itself, and adding a Shopify round trip to their first byte would buy
 * them nothing.
 *
 * Everything is fail-open: any error, timeout or miss falls back to next(),
 * which serves exactly what the site served before.
 */

export const config = { matcher: "/shop/:path*" };

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

export async function fetchProduct(handle: string): Promise<Product | null> {
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
    body: JSON.stringify({
      query: PRODUCT_QUERY,
      variables: { handle, width: OG_IMAGE_WIDTH },
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;

  const json = (await res.json()) as {
    data?: {
      product?: {
        title?: string;
        description?: string;
        productType?: string;
        seo?: { description?: string | null } | null;
        images?: { nodes?: { url?: string; altText?: string | null }[] } | null;
        priceRange?: { minVariantPrice?: { amount?: string; currencyCode?: string } };
      } | null;
    };
  };

  const p = json.data?.product;
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

export default async function middleware(request: Request): Promise<Response> {
  try {
    const ua = request.headers.get("user-agent") ?? "";
    if (!CRAWLER.test(ua)) return next();

    const url = new URL(request.url);
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
