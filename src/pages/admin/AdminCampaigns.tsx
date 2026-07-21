/**
 * Owner campaign console (/admin). One password-gated page: compose a free-form
 * email, preview it in a sandboxed frame, send a test, then blast the newsletter
 * list. Unlinked from the storefront and robots-disallowed; the real protection
 * is the server-side session + per-send password step-up (see api/admin/*).
 *
 * Note: only works against the BFF (`npm run dev:local` or a deploy) — plain
 * `npm run dev` serves no /api routes, so the session check fails and you'll see
 * the login screen with no way through. That's expected.
 */
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
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

type Busy = null | "preview" | "test" | "send";

function Console({ onSignedOut }: { onSignedOut: () => void }) {
  const { push } = useToast();
  const [fields, setFields] = useState<CampaignFields>(emptyFields);
  const [password, setPassword] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [confirmSend, setConfirmSend] = useState(false);

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
            <Eyebrow>Broadcast</Eyebrow>
            <h1 className="mt-2 font-display text-[32px] leading-[1.1] font-medium text-white">
              Send a campaign
            </h1>
            <p className="mt-2 max-w-[520px] text-[14px] leading-[22px] text-muted">
              Reaches every newsletter subscriber. Compose it, preview the real email, and send
              yourself a test before it goes out.
            </p>
          </div>
        </div>

        {/* 01 · Compose */}
        <section className={`mt-8 ${cardCls}`}>
          <StepHeader n="01" title="Compose" desc="The bones of the email — required fields marked *." />
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
          <button onClick={doPreview} disabled={!ready || busy !== null} className={secondaryBtn}>
            {busy === "preview" ? "Rendering…" : previewHtml ? "Refresh preview" : "Render preview"}
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
            <label className="mb-1.5 block text-[13px] font-medium text-body" htmlFor="test-email">
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
                <button onClick={doSend} disabled={!ready || busy !== null} className={dangerBtn}>
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

        <footer className="mt-10 flex items-center gap-2 border-t border-line pt-6 text-[12px] text-faint">
          <span className="inline-block size-1.5 rounded-full bg-accent" aria-hidden />
          LOOK · Owner console — unlisted &amp; password-protected.
        </footer>
      </div>
    </div>
  );
}
