/**
 * Editable email copy, sourced from the `email_template` metaobject in Shopify.
 *
 * The point of this file is that the client can reword any of the three emails —
 * subject, heading, body, button, hero image, discount code — from the Shopify
 * admin, without a developer or a deploy. Only the layout lives in code.
 *
 * **Trap (learned on the `reel` metaobject):** querying a metaobject type that
 * doesn't exist yet does NOT error — the API returns `nodes: []`. So a missing
 * definition would silently produce blank emails. Everything is therefore merged
 * over the hardcoded DEFAULTS below, and a missing type is logged rather than
 * swallowed. The emails read correctly with no metaobject configured at all.
 */
import { adminGraphql, isAdminConfigured } from "../shopify.js";
import { site } from "./brand.js";

export type EmailKey = "welcome_newsletter" | "welcome_account" | "drop";

export interface EmailContent {
  subject: string;
  heading: string;
  body: string[];
  ctaLabel: string;
  ctaUrl: string;
  imageUrl?: string;
  /** Shown as a boxed code. Empty string ⇒ no code block. */
  discountCode: string;
}

const SHOP_URL = "https://look.ind.in";

const DEFAULTS: Record<EmailKey, EmailContent> = {
  welcome_newsletter: {
    subject: `Welcome to ${site.name}`,
    heading: "You're on the list.",
    body: [
      `Thank you for joining ${site.name}. You'll be the first to know when a new drop lands — and we'll keep it to just that.`,
      "Take a look at what's in the studio right now.",
    ],
    ctaLabel: "Shop new arrivals",
    ctaUrl: `${SHOP_URL}/shop`,
    discountCode: "",
  },
  welcome_account: {
    subject: `Your ${site.name} account is ready`,
    heading: "Welcome to LOOK.",
    body: [
      "Your account is set up. You can now track your orders, save delivery addresses for a faster checkout, and keep a wishlist of the pieces you're deciding between.",
      "Everything lives under your account, whenever you need it.",
    ],
    ctaLabel: "Go to my account",
    ctaUrl: `${SHOP_URL}/account/profile`,
    discountCode: "",
  },
  drop: {
    subject: `New in at ${site.name}`,
    heading: "Just dropped.",
    body: ["New pieces have landed. Here's what's just gone live — while sizes last."],
    ctaLabel: "Shop the drop",
    ctaUrl: `${SHOP_URL}/shop`,
    discountCode: "",
  },
};

/* Metaobject entries are matched on their `key` field, falling back to the
   entry handle — so the client can name entries however they like as long as
   one of the two matches. */
const CONTENT_QUERY = /* GraphQL */ `
  query EmailTemplates($first: Int!) {
    metaobjects(type: "email_template", first: $first) {
      nodes {
        handle
        key: field(key: "key") { value }
        subject: field(key: "subject") { value }
        heading: field(key: "heading") { value }
        body: field(key: "body") { value }
        ctaLabel: field(key: "cta_label") { value }
        ctaUrl: field(key: "cta_url") { value }
        discountCode: field(key: "discount_code") { value }
        image: field(key: "image") {
          reference {
            ... on MediaImage { image { url } }
          }
        }
      }
    }
  }
`;

interface FieldValue {
  value?: string | null;
}
interface RawTemplate {
  handle?: string | null;
  key?: FieldValue | null;
  subject?: FieldValue | null;
  heading?: FieldValue | null;
  body?: FieldValue | null;
  ctaLabel?: FieldValue | null;
  ctaUrl?: FieldValue | null;
  discountCode?: FieldValue | null;
  image?: { reference?: { image?: { url?: string | null } | null } | null } | null;
}

/** Cached per function instance. Copy changes are not urgent, and a cold start
 *  picks up edits anyway — this only spares a metaobject read per send. */
let cache: { at: number; byKey: Map<string, RawTemplate> } | null = null;
const TTL_MS = 5 * 60_000;

async function load(): Promise<Map<string, RawTemplate>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.byKey;
  const byKey = new Map<string, RawTemplate>();

  if (isAdminConfigured()) {
    try {
      const res = await adminGraphql(CONTENT_QUERY, { first: 20 });
      const json = (await res.json()) as {
        data?: { metaobjects?: { nodes?: RawTemplate[] } };
        errors?: { message: string }[];
      };
      if (json.errors?.length) {
        // Most likely the app is missing the read_metaobjects scope.
        console.warn("[email] email_template read failed:", json.errors.map((e) => e.message).join("; "));
      }
      const nodes = json.data?.metaobjects?.nodes ?? [];
      if (!nodes.length) {
        console.info("[email] no `email_template` metaobject entries — using built-in copy.");
      }
      for (const n of nodes) {
        const k = n.key?.value?.trim() || n.handle?.trim();
        if (k) byKey.set(k, n);
      }
    } catch (err) {
      console.warn("[email] email_template read threw, using built-in copy:", err);
    }
  }

  cache = { at: Date.now(), byKey };
  return byKey;
}

/** Blank-but-present metaobject fields must not blank out a default. */
const pick = (f: FieldValue | null | undefined, fallback: string): string =>
  f?.value?.trim() || fallback;

export async function getEmailContent(key: EmailKey): Promise<EmailContent> {
  const defaults = DEFAULTS[key];
  const raw = (await load()).get(key);
  if (!raw) return defaults;

  const body = raw.body?.value
    ?.split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

  return {
    subject: pick(raw.subject, defaults.subject),
    heading: pick(raw.heading, defaults.heading),
    body: body?.length ? body : defaults.body,
    ctaLabel: pick(raw.ctaLabel, defaults.ctaLabel),
    ctaUrl: pick(raw.ctaUrl, defaults.ctaUrl),
    imageUrl: raw.image?.reference?.image?.url ?? undefined,
    discountCode: pick(raw.discountCode, defaults.discountCode),
  };
}
