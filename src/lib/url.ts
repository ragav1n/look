/**
 * URL-scheme guard for hrefs built from Shopify-authored content (reel
 * metaobjects, fulfillment tracking, etc.) rather than our own code. React does
 * NOT block `javascript:` in an href, so an admin-authored or metaobject value
 * could execute on click — this allows only http(s) links through.
 */

/** Return `url` verbatim if it is a safe absolute http(s) link, else undefined.
 *  Blocks `javascript:`, `data:`, `vbscript:` and anything else. */
export function safeHttpUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  try {
    const { protocol } = new URL(trimmed);
    if (protocol === "http:" || protocol === "https:") return trimmed;
  } catch {
    // Not a parseable absolute URL — drop it.
  }
  return undefined;
}

/** Same idea as `safeHttpUrl`, for a Shopify-authored value used as an in-app
 *  route (`<Link to>`, `navigate()`). Only a single-slash absolute path is
 *  allowed: `//evil.com` is a protocol-relative URL that the router would
 *  happily follow off-site, and a bare `javascript:...` would be treated as a
 *  relative path but still ends up in an href. Anything else takes `fallback`. */
export function safeAppPath(path: string | null | undefined, fallback = "/shop"): string {
  const trimmed = path?.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  return trimmed;
}
