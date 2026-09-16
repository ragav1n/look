/**
 * Signed handles for uploaded review photos.
 *
 * Uploading a photo and submitting a review are two separate public calls: the
 * browser POSTs each image to `?action=photo`, gets something back, and then
 * sends the whole review to `?action=submit`. Without a signature over what came
 * back, `submit` would be taking a list of image URLs on trust — anyone could
 * post `photos: ["https://evil.example/whatever.jpg"]` and have it rendered on a
 * product page under a real customer's name.
 *
 * So `?action=photo` returns an opaque token committing to the file it actually
 * created, and `submit` stores only the url and GID it recovers from INSIDE that
 * token. A client-supplied url is never stored.
 *
 * Same COOKIE_SECRET as the cookies and the unsubscribe links, and like them
 * this signature commits to its own context tag so a token minted here can't be
 * replayed as one of those (see _lib/cookies.ts).
 */
import crypto from "node:crypto";
import { config } from "./shopify.js";

/** An hour is generous for "pick five photos and finish typing", and short
 *  enough that a leaked token isn't a standing capability. */
const TTL_MS = 60 * 60 * 1000;

export interface PhotoRef {
  /** The Shopify File GID, kept so deleting a review can delete its photos. */
  gid: string;
  /** The cdn.shopify.com URL, stored at 1200px. */
  url: string;
}

const mac = (data: string): string =>
  crypto.createHmac("sha256", config.cookieSecret).update(`photo|${data}`).digest("base64url");

/** Mint a token for a file we just created in Shopify Files. */
export function signPhoto(ref: PhotoRef): string {
  const payload = Buffer.from(JSON.stringify({ ...ref, exp: Date.now() + TTL_MS })).toString(
    "base64url",
  );
  return `${payload}.${mac(payload)}`;
}

/**
 * Recover the file a token commits to, or null if it has been tampered with,
 * truncated, or has expired. Callers must treat null as "no photo", never as
 * "fall back to whatever the client sent".
 */
export function verifyPhoto(token: unknown): PhotoRef | null {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".", 2);
  if (!payload || !sig) return null;

  const expected = Buffer.from(mac(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length) return null;
  if (!crypto.timingSafeEqual(new Uint8Array(expected), new Uint8Array(given))) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as Partial<PhotoRef> & {
      exp?: number;
    };
    if (!data.gid || !data.url || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    /* Belt and braces: the signature already proves we minted this, but pinning
       the host means a future bug that signs an attacker-influenced url still
       can't put a foreign image on a product page. */
    if (!data.url.startsWith("https://cdn.shopify.com/")) return null;
    return { gid: data.gid, url: data.url };
  } catch {
    return null;
  }
}
