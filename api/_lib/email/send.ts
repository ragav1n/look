/**
 * Outbound email, via Resend's REST API.
 *
 * Deliberately no SDK: the rest of the BFF talks to Shopify with plain `fetch`
 * and adding a dependency here would buy nothing but a wrapper. Everything is
 * SERVER-ONLY — `RESEND_API_KEY` must never be VITE_-prefixed.
 *
 * Unconfigured (plain `npm run dev`, or before the domain verifies) the sender
 * logs a summary instead of sending and reports success, so the whole pipeline
 * is exercisable without a key. Same shape as `isAdminConfigured()` in
 * ../shopify.ts.
 */
import { site } from "./brand.js";

const env = (k: string) => process.env[k]?.trim() || "";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
/** Resend's batch endpoint accepts at most 100 messages per call. */
const BATCH_LIMIT = 100;

export const emailConfig = {
  apiKey: env("RESEND_API_KEY"),
  /* A sending address needs no mailbox — replies are steered by Reply-To to the
     support inbox that already exists. */
  from: env("EMAIL_FROM") || `${site.name} <hello@look.ind.in>`,
  replyTo: env("EMAIL_REPLY_TO") || site.email,
};

export const isEmailConfigured = (): boolean => Boolean(emailConfig.apiKey);

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Extra headers — List-Unsubscribe and friends. */
  headers?: Record<string, string>;
}

export interface SendResult {
  sent: number;
  failed: number;
  /** True when nothing was really sent because no API key is configured. */
  simulated: boolean;
}

interface ResendPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  reply_to: string;
  headers?: Record<string, string>;
}

const toPayload = (e: OutgoingEmail): ResendPayload => ({
  from: emailConfig.from,
  to: [e.to],
  subject: e.subject,
  html: e.html,
  text: e.text,
  reply_to: emailConfig.replyTo,
  ...(e.headers ? { headers: e.headers } : {}),
});

function simulate(emails: OutgoingEmail[]): SendResult {
  for (const e of emails) {
    console.log(`[email:dry] to=${e.to} subject=${JSON.stringify(e.subject)} (${e.html.length}b html)`);
  }
  return { sent: emails.length, failed: 0, simulated: true };
}

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${RESEND_ENDPOINT}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${emailConfig.apiKey}`,
    },
    body: JSON.stringify(body),
  });
}

/** Send one email. Resolves false on failure rather than throwing — every caller
 *  treats email as best-effort and must not fail the request it rode in on. */
export async function sendEmail(email: OutgoingEmail): Promise<boolean> {
  if (!isEmailConfigured()) return simulate([email]).failed === 0;
  try {
    const res = await post("", toPayload(email));
    if (!res.ok) {
      console.error(`[email] send failed for ${email.to}: HTTP ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] send threw for ${email.to}:`, err);
    return false;
  }
}

/** Send many, chunked to Resend's 100-per-call batch limit. Chunks are sent
 *  sequentially: a drop going to a few hundred people is not worth risking a
 *  rate-limit burst, and the cron has no deadline pressure. */
export async function sendBatch(emails: OutgoingEmail[]): Promise<SendResult> {
  if (!emails.length) return { sent: 0, failed: 0, simulated: !isEmailConfigured() };
  if (!isEmailConfigured()) return simulate(emails);

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < emails.length; i += BATCH_LIMIT) {
    const chunk = emails.slice(i, i + BATCH_LIMIT);
    try {
      const res = await post("/batch", chunk.map(toPayload));
      if (res.ok) {
        sent += chunk.length;
      } else {
        failed += chunk.length;
        console.error(`[email] batch failed: HTTP ${res.status} ${await res.text()}`);
      }
    } catch (err) {
      failed += chunk.length;
      console.error("[email] batch threw:", err);
    }
  }
  return { sent, failed, simulated: false };
}
