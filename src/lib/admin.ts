/**
 * Admin campaign console — the SPA half. Talks to the /api/admin/* BFF endpoints.
 *
 * The owner session is an HttpOnly cookie the browser attaches automatically, so
 * nothing here reads or stores it. The password is only ever forwarded to the
 * server for the initial login and for the per-send step-up — never persisted.
 */

export interface CampaignFields {
  subject: string;
  heading: string;
  /** Raw textarea text; the server splits blank lines into paragraphs. */
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  discountCode?: string;
}

export interface SendOutcome {
  ok: boolean;
  error?: string;
  message?: string;
  recipients?: number;
  sent?: number;
  failed?: number;
  simulated?: boolean;
}

async function requestJson(
  url: string,
  method: string,
  body?: unknown,
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const init: RequestInit = { method, credentials: "same-origin" };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
}

const postJson = (url: string, body: unknown) => requestJson(url, "POST", body);

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);

function toOutcome(ok: boolean, data: Record<string, unknown>): SendOutcome {
  return {
    ok: ok && data.ok !== false,
    error: str(data.error),
    message: str(data.message),
    recipients: num(data.recipients),
    sent: num(data.sent),
    failed: num(data.failed),
    simulated: bool(data.simulated),
  };
}

/** Is there a valid owner session right now? Drives the login-vs-console gate. */
export async function checkAdminSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/session", { credentials: "same-origin" });
    const data = (await res.json().catch(() => ({}))) as { authenticated?: boolean };
    return res.ok && data.authenticated === true;
  } catch {
    return false;
  }
}

export async function adminLogin(password: string): Promise<boolean> {
  try {
    const { ok } = await requestJson("/api/admin/session", "POST", { password });
    return ok;
  } catch {
    return false;
  }
}

export async function adminLogout(): Promise<void> {
  try {
    await requestJson("/api/admin/session", "DELETE");
  } catch {
    /* best-effort */
  }
}

/** Ask the server to render the email; returns the HTML for a sandboxed preview. */
export async function previewCampaign(fields: CampaignFields): Promise<string | null> {
  try {
    const { ok, data } = await postJson("/api/admin/campaign", { mode: "preview", ...fields });
    return ok ? (str(data.html) ?? null) : null;
  } catch {
    return null;
  }
}

export async function sendTestCampaign(
  fields: CampaignFields,
  testEmail: string,
  password: string,
): Promise<SendOutcome> {
  try {
    const { ok, data } = await postJson("/api/admin/campaign", {
      mode: "test",
      testEmail,
      password,
      ...fields,
    });
    return toOutcome(ok, data);
  } catch {
    return { ok: false, error: "network" };
  }
}

export async function sendCampaign(fields: CampaignFields, password: string): Promise<SendOutcome> {
  try {
    const { ok, data } = await postJson("/api/admin/campaign", { mode: "send", password, ...fields });
    return toOutcome(ok, data);
  } catch {
    return { ok: false, error: "network" };
  }
}

/* --- Reviews --------------------------------------------------------------
 * Every review operation goes to /api/reviews?action=admin with an `op`, rather
 * than to a URL per operation. One endpoint means one auth gate, which is what
 * makes it impossible to add an operation and forget to protect it — and the
 * deploy sits on Vercel's twelve-function cap, so a second file was never an
 * option anyway.                                                             */

/** A review as the moderation screen sees it. Mirrors AdminReview in
 *  api/_lib/reviews.ts. */
export interface AdminReview {
  id: string;
  productId: string;
  productName?: string;
  productHandle?: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  verified: boolean;
  photos?: string[];
  avatar?: string;
  status: "pending" | "approved" | "rejected";
  source: "customer" | "owner";
  /** 1–9 when it's on the homepage wall. */
  wallRank?: number;
  submitted: string;
  /** Masked, e.g. `b***@example.com` — enough to tell two reviewers apart. */
  maskedEmail?: string;
  photoGids: string[];
}

export interface OwnerReviewDraft {
  productGid: string;
  productName?: string;
  productHandle?: string;
  author: string;
  title: string;
  body: string;
  rating: number;
  verified?: boolean;
  /** Signed handles from uploadReviewPhoto — never raw URLs; the server only
   *  trusts what it can recover from inside the signature. */
  photoTokens?: string[];
}

const REVIEWS_ADMIN = "/api/reviews?action=admin";

async function reviewOp(body: Record<string, unknown>): Promise<SendOutcome> {
  try {
    const { ok, data } = await postJson(REVIEWS_ADMIN, body);
    return toOutcome(ok, data);
  } catch {
    return { ok: false, error: "network" };
  }
}

/** The whole queue: pending first, then everything else newest-first. Returns
 *  an empty list rather than throwing, so a backend blip shows an empty tab
 *  instead of a blank console. */
export async function listReviews(): Promise<AdminReview[]> {
  try {
    const { ok, data } = await postJson(REVIEWS_ADMIN, { op: "list" });
    return ok && Array.isArray(data.reviews) ? (data.reviews as AdminReview[]) : [];
  } catch {
    return [];
  }
}

export const approveReview = (id: string) => reviewOp({ op: "approve", id });
export const hideReview = (id: string) => reviewOp({ op: "reject", id });
export const featureReview = (id: string) => reviewOp({ op: "feature", id });
export const unfeatureReview = (id: string) => reviewOp({ op: "unfeature", id });
/** The full wall order, as the up/down buttons rearrange it. */
export const reorderWall = (ids: string[]) => reviewOp({ op: "reorder", ids });
export const createOwnerReview = (draft: OwnerReviewDraft) => reviewOp({ op: "create", ...draft });
/** Destroys the review and its photos. Steps up with the password, like a send. */
export const deleteReview = (id: string, password: string) =>
  reviewOp({ op: "delete", id, password });
/** Recompute every product's rating from scratch — the repair tool for when a
 *  Shopify write failed quietly during moderation. */
export const resyncRatings = () => reviewOp({ op: "resync" });

/* uploadReviewPhoto lives in src/lib/reviews.ts, not here: the shopper's form
   and this console post to the same endpoint, and two copies would drift. */
export { uploadReviewPhoto } from "./reviews";
