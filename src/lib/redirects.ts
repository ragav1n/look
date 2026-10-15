import { redirects } from "../../vercel.json";

/**
 * Product handles renamed in Shopify, read from the same `redirects` list in
 * vercel.json that sends old links to the new page on a full load.
 *
 * Vercel only sees full page loads. A click inside the app never reaches it, so
 * a card rendered before the rename (a tab left open, or the Storefront API's
 * few seconds of cache lag) would land on the 404 page. The product page checks
 * here first and follows the rename itself. One list, so a future rename is
 * still a single line in vercel.json.
 */
const MOVED = new Map(
  redirects
    .filter((r) => r.source.startsWith("/shop/") && r.destination.startsWith("/shop/"))
    .map((r) => [r.source.slice("/shop/".length), r.destination.slice("/shop/".length)]),
);

/** The current handle for a renamed product, or undefined if it never moved. */
export const renamedTo = (handle: string): string | undefined => MOVED.get(handle);
