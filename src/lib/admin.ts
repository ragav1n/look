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
