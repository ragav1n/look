/**
 * Reviews — the SPA half. Reads from /api/reviews (see api/reviews.ts).
 *
 * Nothing in here throws. Both callers render something useful with no reviews
 * at all — the homepage wall falls back to its hand-written notes, the PDP panel
 * reads "Reviews (0)" — so a failure returning an empty list degrades to exactly
 * that, while a rejection would blank a whole section. Plain `npm run dev`
 * serves no /api routes, so this is also what keeps the storefront browsable
 * without the BFF running.
 */
import type { Review } from "@/types";

async function readReviews(url: string): Promise<Review[]> {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return [];
    const data = (await res.json()) as { reviews?: Review[] };
    return Array.isArray(data.reviews) ? data.reviews : [];
  } catch {
    return [];
  }
}

/** The client's curated homepage picks, in her chosen order. Usually fewer than
 *  nine; composeWall() backfills the rest. */
export const getWallReviews = (): Promise<Review[]> => readReviews("/api/reviews?action=wall");

/** Approved reviews for one product, newest first. Keyed on the Shopify GID
 *  rather than the handle, so renaming a product doesn't orphan its reviews. */
export const getProductReviews = (productGid: string): Promise<Review[]> =>
  productGid
    ? readReviews(`/api/reviews?action=list&product=${encodeURIComponent(productGid)}`)
    : Promise.resolve([]);

/**
 * Ask Shopify's CDN for a resized copy of a file it hosts.
 *
 * Review photos are stored ONCE at 1200px and every smaller surface is served
 * from that same upload — the wall avatar at 96, the PDP thumbnail strip at 240,
 * the lightbox at full size. cdn.shopify.com honours `?width=N`, so this costs
 * no extra storage and saves the homepage pulling a full photo per avatar.
 *
 * Only rewrites Shopify URLs. Anything else (a bundled fixture avatar, a data:
 * URL) is returned untouched.
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

/* --- Writing one ---------------------------------------------------------- */

export interface ReviewRight {
  may: boolean;
  via?: "invite" | "account";
  /** Their own address, so the form needn't ask for something we already know. */
  email?: string;
}

/**
 * May this visitor review this piece?
 *
 * A UI hint, nothing more: the server proves it again when the review is
 * actually submitted, so this deciding wrongly costs a wasted form and never a
 * bad review. `token` is the `?review=` value from a review-request email.
 */
export async function canWriteReview(productGid: string, token?: string): Promise<ReviewRight> {
  if (!productGid) return { may: false };
  try {
    const qs = new URLSearchParams({ action: "eligibility", product: productGid });
    if (token) qs.set("token", token);
    const res = await fetch(`/api/reviews?${qs}`, { credentials: "same-origin" });
    if (!res.ok) return { may: false };
    return (await res.json()) as ReviewRight;
  } catch {
    return { may: false };
  }
}

export interface ReviewDraft {
  productGid: string;
  productName?: string;
  productHandle?: string;
  author: string;
  title: string;
  body: string;
  rating: number;
  token?: string;
  photoTokens?: string[];
  /** The hidden trap field. Empty for a person; a bot fills it in. */
  honeypot?: string;
}

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

/** File a review. It arrives pending — the owner approves it before anyone
 *  sees it, which the form says out loud so nobody waits for it to appear. */
export async function submitReview(draft: ReviewDraft): Promise<SubmitResult> {
  try {
    const res = await fetch("/api/reviews?action=submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        ...draft,
        contact_reason: draft.honeypot ?? "",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    return { ok: res.ok && data.ok !== false, error: data.error };
  } catch {
    return { ok: false, error: "network" };
  }
}

/**
 * Upload one prepared photo and get back a signed handle.
 *
 * `dataUrl` must be a `data:` URL from preparePhoto — never a blob:, which our
 * CSP forbids. The owner console calls this with no token, since her admin
 * session is proof enough; a shopper passes the product and their invite token.
 */
export async function uploadReviewPhoto(
  dataUrl: string,
  productGid?: string,
  token?: string,
): Promise<{ url: string; gid: string; token: string } | { error: string }> {
  try {
    const res = await fetch("/api/reviews?action=photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ image: dataUrl, productGid, token }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok && typeof data.token === "string" && typeof data.url === "string") {
      return { url: data.url, gid: String(data.gid), token: data.token };
    }
    return { error: typeof data.error === "string" ? data.error : "upload_failed" };
  } catch {
    return { error: "network" };
  }
}
