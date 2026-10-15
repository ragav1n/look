/**
 * Responsive Shopify imagery.
 *
 * Product photos are uploaded as full camera originals (often 3–4k px wide,
 * ~1MB each) and the site used to load them as-is, even into a 320px card:
 * ~18MB on the homepage, and the main thread stalling to decode them mid-scroll.
 * cdn.shopify.com resizes on request (`?width=N`) and negotiates WebP/AVIF on
 * its own, so a srcset lets the browser pull only the size it will paint.
 */

/**
 * Ask Shopify's CDN for a resized copy of a file it hosts. Only rewrites
 * Shopify URLs; anything else (a bundled asset, a data: URL) is returned as-is.
 */
export function cdnResize(url: string, width: number): string {
  if (!url.includes("cdn.shopify.com")) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("width", String(width));
    return u.toString();
  } catch {
    return url;
  }
}

const WIDTHS = [240, 360, 480, 640, 800, 1080, 1440, 1920, 2560];

/** `src` + `srcSet` + `sizes` for an <img>; spread it onto the element.
 *  `sizes` is how wide the image is laid out, so the browser can pick. */
export function responsiveImg(url: string, sizes: string) {
  if (!url.includes("cdn.shopify.com")) return { src: url };
  return {
    src: cdnResize(url, 1080),
    srcSet: WIDTHS.map((w) => `${cdnResize(url, w)} ${w}w`).join(", "),
    sizes,
  };
}
