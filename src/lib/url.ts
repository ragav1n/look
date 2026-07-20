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
