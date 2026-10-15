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

/** How wide each surface lays its photo out, measured on the live site at
 *  360–1920px. Keep these honest: an overstated `sizes` downloads a bigger file
 *  than is painted, an understated one paints a soft photo. */
export const IMG_SIZES = {
  /** PDP main photo: full width minus the 24px gutters, then a fixed column. */
  pdpMain: "(min-width: 1024px) 560px, calc(100vw - 48px)",
  /** Lightbox: fitted to the height left by the close bar and thumbnail rail
   *  (0.75 is the widest catalog ratio, 3:4). Floored at the gallery's own
   *  size, so whenever the gallery's file is big enough the lightbox reuses
   *  that cached file instead of downloading a second, smaller copy. */
  lightbox:
    "(min-width: 1024px) max(560px, min(calc(100vw - 32px), calc((100vh - 168px) * 0.75))), " +
    "max(calc(100vw - 48px), min(calc(100vw - 32px), calc((100vh - 168px) * 0.75)))",
  /** ProductCard: two columns, then three beside the Shop sidebar (four in
   *  "You may also like", slightly narrower), capped by the 1338px container. */
  productCard: "(min-width: 1400px) 320px, (min-width: 1024px) calc(33vw - 130px), calc(50vw - 30px)",
} as const;

const warmed = new Map<string, Promise<void>>();

/**
 * Download and decode a photo ahead of need, at the exact file the <img> will
 * pick, so showing it later is a cache hit with no decode stall. Passing the
 * same srcset + sizes is what makes it the same file. Repeat calls are free.
 */
export function preloadImg(url: string | undefined, sizes: string): Promise<void> {
  if (!url || typeof Image === "undefined") return Promise.resolve();
  const key = `${url}|${sizes}`;
  const known = warmed.get(key);
  if (known) return known;
  const img = new Image();
  img.decoding = "async";
  const r = responsiveImg(url, sizes);
  if (r.sizes) img.sizes = r.sizes;
  if (r.srcSet) img.srcset = r.srcSet;
  img.src = r.src;
  const done = img.decode().catch(() => {});
  warmed.set(key, done);
  return done;
}

/** Whether the visitor asked to save data. Background preloading stays off for
 *  them; on-demand loading (what they tap) is unchanged. */
export const saveData = (): boolean =>
  typeof navigator !== "undefined" &&
  Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
