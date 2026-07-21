/**
 * Owner campaign console (/admin). One password-gated page with four tabs, so
 * it's clear which shopper emails LOOK sends automatically and which the owner
 * sends by hand:
 *   - Campaigns      — compose/preview/test/send a free-form blast (the only
 *                      tab that sends; reuses api/admin/campaign).
 *   - Order emails   — explainer: Shopify sends these automatically.
 *   - Abandoned carts— explainer: turn Shopify's automation on, once.
 *   - New arrivals   — explainer: the daily drop digest runs on its own.
 * The explainer tabs are pure copy + a deep-link into the right Shopify page;
 * they add no backend (the deploy sits at the Hobby 12-function cap).
 *
 * Unlinked from the storefront and robots-disallowed; the real protection is the
 * server-side session + per-send password step-up (see api/admin/*).
 *
 * Note: only works against the BFF (`npm run dev:local` or a deploy) — plain
 * `npm run dev` serves no /api routes, so the session check fails and you'll see
 * the login screen with no way through. That's expected.
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import consolePhoto from "@/assets/about-pearl-lace.jpg";
import logoWhite from "@/assets/look-logo-white.png";
import { useToast } from "@/context/ToastContext";
import {
  adminLogin,
  adminLogout,
  checkAdminSession,
  type CampaignFields,
  previewCampaign,
  sendCampaign,
  sendTestCampaign,
} from "@/lib/admin";

const inputCls =
  "h-[46px] w-full rounded-btn border border-line bg-surface px-4 text-[14px] text-white placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15";
const secondaryBtn =
  "inline-flex h-[46px] cursor-pointer items-center justify-center rounded-btn border border-line px-6 text-[14px] font-medium text-body transition-colors hover:border-line-strong hover:text-white disabled:cursor-not-allowed disabled:opacity-50";
const dangerBtn =
  "inline-flex h-[46px] cursor-pointer items-center justify-center rounded-btn bg-accent px-6 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

/** LOOK's Shopify admin. The explainer tabs deep-link the owner straight to the
 *  right settings page rather than making her hunt through Shopify's menus. */
const SHOP_ADMIN = "https://admin.shopify.com/store/look-10300";

/** Small red small-caps label used across the storefront's sections. */
function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11px] tracking-[0.18em] text-accent uppercase">{children}</p>;
}

const emptyFields: CampaignFields = {
  subject: "",
  heading: "",
  body: "",
  ctaLabel: "",
  ctaUrl: "",
  imageUrl: "",
  discountCode: "",
};

/** Map a server error code to a human line; undefined ⇒ use a generic fallback. */
function errorText(code?: string): string | undefined {
  switch (code) {
    case "invalid_test_email":
      return "That test email doesn't look valid.";
    case "password_required":
      return "Password incorrect — try again.";
    case "missing_fields":
      return "Fill in subject, heading, and message first.";
    case "admin_not_configured":
      return "Email isn't configured on the server yet.";
    case "cooldown":
      return "A campaign was just sent — wait a minute before sending again.";
    default:
      return undefined;
  }
}

export default function AdminCampaigns() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    checkAdminSession().then(setAuthed);
  }, []);

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-6">
        <div className="flex animate-pulse items-center gap-3 text-muted">
          <img src={logoWhite} alt="" className="h-6 w-auto object-contain opacity-70" />
          <span className="text-[13px]">Checking session…</span>
        </div>
      </div>
    );
  }
  return authed ? (
    <Console onSignedOut={() => setAuthed(false)} />
  ) : (
    <LoginForm onAuthed={() => setAuthed(true)} />
  );
}

function LoginForm({ onAuthed }: { onAuthed: () => void }) {
  const { push } = useToast();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    const ok = await adminLogin(password);
    setBusy(false);
    setPassword("");
    if (ok) onAuthed();
    else push("Incorrect password.", "error");
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-page lg:grid-cols-2">
      {/* Editorial panel — mirrors the customer auth split so the console reads as
          part of LOOK, but with its own image + owner-facing script line. */}
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src={consolePhoto}
          alt=""
          className="animate-auth-image absolute inset-0 h-full w-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
        <div className="absolute top-11 left-12 flex items-center gap-3">
          <img src={logoWhite} alt="LOOK" className="h-6 w-auto object-contain" />
          <span className="text-[11px] tracking-[0.24em] text-white/55 uppercase">Console</span>
        </div>
        <div className="absolute bottom-12 left-12 max-w-[400px] text-white">
          <Eyebrow>Owner access</Eyebrow>
          <p className="mt-3 font-script text-[46px] leading-[1.1] text-white">
            Speak to every subscriber
          </p>
          <p className="mt-3 text-[15px] leading-[24px] text-white/80">
            Compose, preview, and send campaigns to the LOOK community — all from one quiet room.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center px-6 py-12">
        <span className="animate-glow pointer-events-none absolute top-10 right-8 size-56 rounded-full bg-accent/15 blur-3xl" />
        <span
          className="animate-glow pointer-events-none absolute bottom-12 left-6 size-44 rounded-full bg-accent/10 blur-3xl"
          style={{ animationDelay: "2s" }}
        />
        <div className="animate-auth-panel relative w-full max-w-[380px]">
          <img src={logoWhite} alt="LOOK" className="h-8 w-auto object-contain lg:hidden" />
          <div className="mt-8 lg:mt-0">
            <Eyebrow>Owner console</Eyebrow>
          </div>
          <h1 className="mt-2 font-display text-[30px] leading-[1.1] font-medium text-white">
            Campaigns
          </h1>
          <p className="mt-2 text-[14px] leading-[22px] text-muted">
            Sign in to compose and broadcast to your newsletter subscribers.
          </p>
          <form onSubmit={submit} className="mt-8">
            <label
              className="mb-1.5 block text-[13px] font-medium text-body"
              htmlFor="admin-password"
            >
              Admin password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              autoFocus
            />
            <button
              type="submit"
              disabled={busy || !password}
              className="mt-4 h-[48px] w-full cursor-pointer rounded-btn bg-white text-[15px] font-medium text-black transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="mt-6 flex items-center gap-2 text-[12px] text-faint">
            <span className="inline-block size-1.5 rounded-full bg-accent" aria-hidden />
            Unlisted &amp; password-protected — every send re-checks this password.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-body">{label}</span>
        {hint && <span className="text-[12px] text-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** Numbered, editorial step header — the console reads as Compose → Preview → Send. */
function StepHeader({ n, title, desc }: { n: string; title: string; desc?: string }) {
  return (
    <div className="mb-6 flex items-start gap-3.5">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-accent/45 text-[12px] font-medium text-accent">
        {n}
      </span>
      <div>
        <h2 className="font-display text-[19px] leading-tight font-medium text-white">{title}</h2>
        {desc && <p className="mt-1 text-[13px] leading-[19px] text-muted">{desc}</p>}
      </div>
    </div>
  );
}

const cardCls = "rounded-card border border-line bg-white/[0.02] p-6 sm:p-7";

/* --- Explainer-tab building blocks ---------------------------------------- */

/** A small status pill. "auto" = LOOK/Shopify handles it with no action; "action"
 *  = a one-time thing the owner sets up. Red + grey only (no other accent). */
function StatusBadge({ tone, children }: { tone: "auto" | "action"; children: ReactNode }) {
  const styles =
    tone === "auto"
      ? "border-line bg-white/[0.03] text-muted"
      : "border-accent/40 bg-accent-tint-soft/40 text-white";
  const dot = tone === "auto" ? "bg-muted" : "bg-accent";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] tracking-[0.16em] uppercase ${styles}`}
    >
      <span className={`inline-block size-1.5 rounded-full ${dot}`} aria-hidden />
      {children}
    </span>
  );
}

interface GuideStep {
  title: string;
  detail?: ReactNode;
}

/** Numbered how-it-works list, reusing the console's red circle-badge motif.
 *  Each step is a bold title + a plain-language detail line — written for a
 *  non-technical owner who wants to be told exactly what to do and where. */
function StepList({ items }: { items: GuideStep[] }) {
  return (
    <ol className="mt-6 space-y-5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3.5">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-accent/40 text-[11px] font-medium text-accent">
            {i + 1}
          </span>
          <div>
            <p className="text-[14px] leading-[21px] font-medium text-white">{item.title}</p>
            {item.detail && (
              <p className="mt-1 text-[13px] leading-[20px] text-muted">{item.detail}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** "Good to know" — short Q&A answering the questions a first-timer will have. */
function GoodToKnow({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="mt-7 border-t border-line pt-6">
      <p className="text-[11px] tracking-[0.16em] text-faint uppercase">Good to know</p>
      <dl className="mt-4 space-y-4">
        {items.map((item, i) => (
          <div key={i}>
            <dt className="text-[13px] font-medium text-body">{item.q}</dt>
            <dd className="mt-1 text-[13px] leading-[20px] text-muted">{item.a}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** An explainer tab: what the email is, whether it's automatic, step-by-step
 *  instructions, an optional caveat, a short Q&A, and a deep-link into Shopify. */
function GuideTab({
  eyebrow,
  title,
  badge,
  lead,
  stepsLabel,
  steps,
  note,
  goodToKnow,
  link,
}: {
  eyebrow: string;
  title: string;
  badge: { tone: "auto" | "action"; label: string };
  lead: ReactNode;
  /** Small heading above the numbered steps, e.g. "How it works" / "What to do". */
  stepsLabel: string;
  steps: GuideStep[];
  note?: ReactNode;
  goodToKnow?: { q: string; a: ReactNode }[];
  link?: { label: string; href: string };
}) {
  return (
    <section className={cardCls}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>{eyebrow}</Eyebrow>
        <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
      </div>
      <h2 className="mt-3 font-display text-[24px] leading-[1.15] font-medium text-white">
        {title}
      </h2>
      <p className="mt-3 max-w-[560px] text-[14px] leading-[23px] text-body">{lead}</p>

      <p className="mt-7 text-[11px] tracking-[0.16em] text-faint uppercase">{stepsLabel}</p>
      <StepList items={steps} />

      {note && (
        <p className="mt-6 flex items-start gap-2.5 rounded-btn border border-accent/25 bg-accent-tint-soft/30 p-4 text-[13px] leading-[20px] text-body">
          <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          <span>{note}</span>
        </p>
      )}

      {goodToKnow && <GoodToKnow items={goodToKnow} />}

      {link && (
        <a href={link.href} target="_blank" rel="noopener noreferrer" className={`mt-7 ${secondaryBtn}`}>
          {link.label}
          <span aria-hidden className="ml-2">
            ↗
          </span>
        </a>
      )}
    </section>
  );
}

/* --- The console ---------------------------------------------------------- */

type TabKey = "campaign" | "orders" | "abandoned" | "arrivals";
const TABS: { key: TabKey; label: string }[] = [
  { key: "campaign", label: "Campaigns" },
  { key: "orders", label: "Order emails" },
  { key: "abandoned", label: "Abandoned carts" },
  { key: "arrivals", label: "New arrivals" },
];

type Busy = null | "preview" | "test" | "send";

function Console({ onSignedOut }: { onSignedOut: () => void }) {
  const { push } = useToast();
  const [tab, setTab] = useState<TabKey>("campaign");
  const [fields, setFields] = useState<CampaignFields>(emptyFields);
  const [password, setPassword] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [confirmSend, setConfirmSend] = useState(false);

  // WAI-ARIA tabs: roving tabindex + arrow/Home/End nav, mirroring ProductTabs.
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onTabKey = (e: KeyboardEvent, index: number) => {
    const last = TABS.length - 1;
    let next: number;
    if (e.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    setTab(TABS[next].key);
    tabRefs.current[next]?.focus();
  };

  const set =
    (k: keyof CampaignFields) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields((f) => ({ ...f, [k]: e.target.value }));

  const ready = Boolean(fields.subject.trim() && fields.heading.trim() && fields.body.trim());

  async function doPreview() {
    if (!ready || busy) return;
    setBusy("preview");
    const html = await previewCampaign(fields);
    setBusy(null);
    if (html) setPreviewHtml(html);
    else push("Couldn't render a preview — check the required fields.", "error");
  }

  async function doTest() {
    if (busy) return;
    if (!ready) return push("Fill in subject, heading, and message first.", "error");
    if (!password) return push("Enter your admin password to send.", "error");
    if (!testEmail.trim()) return push("Enter a test recipient address.", "error");
    setBusy("test");
    const r = await sendTestCampaign(fields, testEmail.trim(), password);
    setBusy(null);
    if (r.ok) {
      push(
        r.simulated
          ? "Test simulated (no email key configured)."
          : `Test sent to ${testEmail.trim()}.`,
        "success",
      );
    } else {
      push(errorText(r.error) ?? "Test send failed.", "error");
    }
  }

  async function doSend() {
    if (busy) return;
    if (!ready) return push("Fill in subject, heading, and message first.", "error");
    if (!password) return push("Enter your admin password to send.", "error");
    if (!confirmSend) {
      setConfirmSend(true);
      return;
    }
    setBusy("send");
    const r = await sendCampaign(fields, password);
    setBusy(null);
    setConfirmSend(false);
    if (r.ok) {
      setPassword("");
      push(
        r.simulated
          ? `Simulated for ${r.recipients ?? 0} subscribers (no email key configured).`
          : `Sent to ${r.sent ?? 0} of ${r.recipients ?? 0} subscribers${
              r.failed ? `, ${r.failed} failed` : ""
            }.`,
        "success",
      );
    } else {
      push(r.message ?? errorText(r.error) ?? "Send failed.", "error");
    }
  }

  async function signOut() {
    await adminLogout();
    onSignedOut();
  }

  return (
    <div className="min-h-screen bg-page px-6 py-8 text-white sm:py-12">
      <div className="animate-page-in mx-auto w-full max-w-[760px]">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 border-b border-line pb-6">
          <div className="flex items-center gap-3">
            <img src={logoWhite} alt="LOOK" className="h-7 w-auto object-contain" />
            <span className="text-[11px] tracking-[0.24em] text-faint uppercase">Console</span>
          </div>
          <button
            onClick={signOut}
            className="text-[13px] text-muted transition-colors hover:text-white"
          >
            Sign out
          </button>
        </header>

        {/* Heading with a soft signature glow */}
        <div className="relative mt-10">
          <span className="animate-glow pointer-events-none absolute -top-10 -left-8 size-52 rounded-full bg-accent/12 blur-3xl" />
          <div className="relative">
            <Eyebrow>Community email</Eyebrow>
            <h1 className="mt-2 font-display text-[32px] leading-[1.1] font-medium text-white">
              Emails to your shoppers
            </h1>
            <p className="mt-2 max-w-[560px] text-[14px] leading-[22px] text-muted">
              Everything LOOK sends to customers lives here. Most of it runs on its own; the
              Campaigns tab is the one you send by hand.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Email types"
          className="mt-8 flex gap-1 overflow-x-auto border-b border-line"
        >
          {TABS.map(({ key, label }, i) => {
            const selected = tab === key;
            return (
              <button
                key={key}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                type="button"
                id={`${baseId}-tab-${key}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(key)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={`relative -mb-px cursor-pointer px-4 py-3 text-[14px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  selected ? "text-white" : "text-muted hover:text-white"
                }`}
              >
                {label}
                <span
                  aria-hidden
                  className={`absolute inset-x-0 -bottom-px h-[2px] origin-center rounded-full bg-accent transition-transform duration-300 ease-out ${
                    selected ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Active panel — re-keyed so it fades/rises in on tab change */}
        <div
          key={tab}
          role="tabpanel"
          id={`${baseId}-panel-${tab}`}
          aria-labelledby={`${baseId}-tab-${tab}`}
          tabIndex={0}
          className="animate-tab-panel mt-8 focus-visible:outline-none"
        >
          {tab === "campaign" && (
            <>
              <p className="max-w-[560px] text-[14px] leading-[23px] text-body">
                Announce a sale, a new drop, or any news to everyone on your newsletter list.
                Preview the real email and send yourself a test before it goes out. Using a
                discount code? Create it in Shopify first, then type the same code below so it
                shows in the email.
              </p>

              {/* 01 · Compose */}
              <section className={`mt-6 ${cardCls}`}>
                <StepHeader
                  n="01"
                  title="Compose"
                  desc="The bones of the email — required fields marked *."
                />
                <div className="space-y-5">
                  <Field label="Subject *">
                    <input
                      className={inputCls}
                      value={fields.subject}
                      onChange={set("subject")}
                      placeholder="48 hours only — 20% off"
                    />
                  </Field>
                  <Field label="Heading *">
                    <input
                      className={inputCls}
                      value={fields.heading}
                      onChange={set("heading")}
                      placeholder="The weekend sale is on"
                    />
                  </Field>
                  <Field label="Message *" hint="Leave a blank line to start a new paragraph.">
                    <textarea
                      className={`${inputCls} h-auto min-h-[140px] resize-y py-3 leading-relaxed`}
                      value={fields.body}
                      onChange={set("body")}
                      placeholder="Write your message…"
                    />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Button label" hint="optional">
                      <input
                        className={inputCls}
                        value={fields.ctaLabel}
                        onChange={set("ctaLabel")}
                        placeholder="Shop the sale"
                      />
                    </Field>
                    <Field label="Button link" hint="optional">
                      <input
                        className={inputCls}
                        value={fields.ctaUrl}
                        onChange={set("ctaUrl")}
                        placeholder="https://look.ind.in/shop"
                      />
                    </Field>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Hero image URL" hint="optional">
                      <input
                        className={inputCls}
                        value={fields.imageUrl}
                        onChange={set("imageUrl")}
                        placeholder="https://…"
                      />
                    </Field>
                    <Field label="Discount code" hint="optional">
                      <input
                        className={inputCls}
                        value={fields.discountCode}
                        onChange={set("discountCode")}
                        placeholder="WEEKEND20"
                      />
                    </Field>
                  </div>
                </div>
              </section>

              {/* 02 · Preview */}
              <section className={`mt-6 ${cardCls}`}>
                <StepHeader n="02" title="Preview" desc="See exactly what lands in the inbox." />
                <button
                  onClick={doPreview}
                  disabled={!ready || busy !== null}
                  className={secondaryBtn}
                >
                  {busy === "preview"
                    ? "Rendering…"
                    : previewHtml
                      ? "Refresh preview"
                      : "Render preview"}
                </button>
                {previewHtml && (
                  <iframe
                    /* Sandboxed with no allow-* tokens: the email is static, this just
                       denies it scripts/forms/same-origin as defence-in-depth. */
                    sandbox=""
                    srcDoc={previewHtml}
                    title="Email preview"
                    className="mt-5 h-[560px] w-full rounded-card border border-line bg-white"
                  />
                )}
              </section>

              {/* 03 · Send */}
              <section className={`mt-6 ${cardCls}`}>
                <StepHeader
                  n="03"
                  title="Send"
                  desc="Your password is required for every send — test or live."
                />

                <label className="mb-1.5 block text-[13px] font-medium text-body" htmlFor="stepup">
                  Admin password
                </label>
                <input
                  id="stepup"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                />

                <div className="mt-5">
                  <label
                    className="mb-1.5 block text-[13px] font-medium text-body"
                    htmlFor="test-email"
                  >
                    Send yourself a test
                  </label>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      id="test-email"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="you@look.ind.in"
                      className={inputCls}
                    />
                    <button onClick={doTest} disabled={busy !== null} className={secondaryBtn}>
                      {busy === "test" ? "Sending…" : "Send test"}
                    </button>
                  </div>
                </div>

                <div className="mt-6 border-t border-line pt-6">
                  {!confirmSend ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <button
                        onClick={doSend}
                        disabled={!ready || busy !== null}
                        className={dangerBtn}
                      >
                        Send to all subscribers
                      </button>
                      <span className="text-[12px] text-faint">This emails your entire list.</span>
                    </div>
                  ) : (
                    <div className="rounded-btn border border-accent/30 bg-accent-tint-soft/40 p-4">
                      <p className="text-[13px] font-medium text-white">Send to everyone now?</p>
                      <p className="mt-0.5 text-[12px] text-sale">
                        This emails your entire subscriber list and can't be undone.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button onClick={doSend} disabled={busy !== null} className={dangerBtn}>
                          {busy === "send" ? "Sending…" : "Yes — send now"}
                        </button>
                        <button
                          onClick={() => setConfirmSend(false)}
                          disabled={busy !== null}
                          className="text-[13px] text-muted transition-colors hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {tab === "orders" && (
            <GuideTab
              eyebrow="Order confirmation"
              title="Sent automatically by Shopify"
              badge={{ tone: "auto", label: "Automatic — nothing to do" }}
              lead="When someone buys from LOOK, Shopify emails them straight away with their order number, what they bought, and the total. You don't press send or set anything up — it happens by itself for every single order. Here's what happens behind the scenes."
              stepsLabel="What happens"
              steps={[
                {
                  title: "The customer pays",
                  detail:
                    "They finish paying on Shopify's secure checkout page. The moment the payment goes through, the order is created.",
                },
                {
                  title: "Shopify emails them the confirmation",
                  detail:
                    "Within seconds the customer gets an “Order confirmed” email with their order number, the items, and a receipt. You don't write or send this — Shopify does.",
                },
                {
                  title: "The order shows up in your admin",
                  detail:
                    "It appears under Orders in your Shopify admin. That's where you go to pack it and mark it shipped.",
                },
                {
                  title: "Shipping updates go out too",
                  detail:
                    "When you mark the order shipped and add a tracking number, Shopify automatically emails the customer that it's on the way.",
                },
              ]}
              goodToKnow={[
                {
                  q: "Do I need to switch anything on?",
                  a: "No. This works out of the box for every order. There is nothing to configure.",
                },
                {
                  q: "Can I change what the email says?",
                  a: "Yes, but it's optional. In Shopify go to Settings → Notifications and edit the “Order confirmation” template. The default already looks clean.",
                },
                {
                  q: "A customer says they didn't get it?",
                  a: "Ask them to check their spam and promotions folders first. You can also re-send it: open that order in Shopify and use “Resend email”.",
                },
              ]}
              link={{ label: "Open Shopify notifications", href: `${SHOP_ADMIN}/settings/notifications` }}
            />
          )}

          {tab === "abandoned" && (
            <GuideTab
              eyebrow="Cart reminders"
              title="A gentle nudge, sent for you"
              badge={{ tone: "action", label: "Set up once, then automatic" }}
              lead="Some shoppers add a piece, start checkout, then get distracted and leave. Shopify can automatically email them a reminder to come back — once after 1 hour, and again after 24 hours. You set this up once, and after that it runs on its own forever."
              stepsLabel="How it's set up"
              steps={[
                {
                  title: "Open Marketing → Automations in Shopify",
                  detail:
                    "This is where the automatic emails live. Look for the one called “Recover abandoned checkout”.",
                },
                {
                  title: "It waits, then emails — twice",
                  detail:
                    "One hour after a shopper leaves, it sends the first reminder. If they still haven't come back after 24 hours, it sends a second, final one.",
                },
                {
                  title: "It skips anyone who came back",
                  detail:
                    "If they finish their order in the meantime, the reminders stop automatically. No one gets a “you forgot something” email after they've already bought.",
                },
                {
                  title: "Change the wording anytime",
                  detail:
                    "Inside the automation, click the “Send marketing email” step to edit the subject and message the shopper sees.",
                },
              ]}
              note="This can only reach people who typed their email during checkout. If someone just adds to their cart and closes the tab without starting checkout, we never get their email address, so there's no way to remind them. That's normal for every online store, not just LOOK."
              goodToKnow={[
                {
                  q: "Is it turned on right now?",
                  a: "Yes — it's switched on. As long as the store is live, it runs by itself. (Reminders only go out once the store is open to the public.)",
                },
                {
                  q: "How can I test it myself?",
                  a: "Start a checkout on your own store, enter your email, then leave without paying. You'll get the reminder after the wait. To test faster, you can temporarily shorten the waits to a couple of minutes, then set them back to 1 hour / 24 hours.",
                },
                {
                  q: "Will it annoy people with too many emails?",
                  a: "No. It's capped at two gentle reminders per abandoned cart, and it stops the moment they buy.",
                },
              ]}
              link={{ label: "Open Shopify automations", href: `${SHOP_ADMIN}/marketing/automations` }}
            />
          )}

          {tab === "arrivals" && (
            <GuideTab
              eyebrow="New arrivals digest"
              title="Your new pieces, emailed for you"
              badge={{ tone: "auto", label: "Automatic — just publish" }}
              lead="Every morning at 10:30, LOOK automatically emails your community the products you've added recently. You never mark anything as “new” and you never press send — just add the product to your store, and it goes out the next morning."
              stepsLabel="What to do"
              steps={[
                {
                  title: "Add the product in Shopify",
                  detail: "Create it like any other product — photos, price, and sizes.",
                },
                {
                  title: "Set it “Active” and on the Online Store",
                  detail:
                    "On the product page, set Status to “Active”, and under Publishing / Sales channels make sure “Online Store” is ticked. That's what tells LOOK the piece is ready to show off.",
                },
                {
                  title: "Wait for the next morning",
                  detail:
                    "At 10:30 AM the next day, everyone on your list gets one email showing your new pieces, newest first.",
                },
                {
                  title: "That's it — it's marked done",
                  detail:
                    "After the email goes out, the product is quietly marked so it's never emailed a second time.",
                },
              ]}
              note="You do NOT need to tag anything as “new”. Publishing the product is the only trigger. The email looks back over the last 30 days, so anything you publish will be included in the next morning's send."
              goodToKnow={[
                {
                  q: "I added 5 products — does it send 5 emails?",
                  a: "No. Everything new goes out in ONE email, shown newest first.",
                },
                {
                  q: "I published something but don't want it emailed?",
                  a: "Add the tag “drop-announced” to that product in Shopify before 10:30 AM, and it'll be skipped.",
                },
                {
                  q: "I want to feature an older product again?",
                  a: "Remove the “drop-announced” tag from it, and it'll go out in the next morning's email.",
                },
              ]}
              link={{ label: "Open Shopify products", href: `${SHOP_ADMIN}/products` }}
            />
          )}
        </div>

        <footer className="mt-10 flex items-center gap-2 border-t border-line pt-6 text-[12px] text-faint">
          <span className="inline-block size-1.5 rounded-full bg-accent" aria-hidden />
          LOOK · Owner console — unlisted &amp; password-protected.
        </footer>
      </div>
    </div>
  );
}
