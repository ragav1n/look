/**
 * Owner campaign console (/admin). One password-gated page: compose a free-form
 * email, preview it in a sandboxed frame, send a test, then blast the newsletter
 * list. Unlinked from the storefront and robots-disallowed; the real protection
 * is the server-side session + per-send password step-up (see api/admin/*).
 *
 * Note: only works against the BFF (`npm run dev:bff` or a deploy) — plain
 * `npm run dev` serves no /api routes, so the session check fails and you'll see
 * the login screen with no way through. That's expected.
 */
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
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
  "h-[46px] w-full rounded-btn border border-line bg-surface px-4 text-[14px] text-white outline-none transition-colors focus:border-accent";
const secondaryBtn =
  "h-[46px] cursor-pointer rounded-btn border border-line px-6 text-[14px] font-medium text-body transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50";
const dangerBtn =
  "h-[46px] cursor-pointer rounded-btn bg-accent px-6 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

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
      <Shell>
        <p className="text-[14px] text-muted">Checking session…</p>
      </Shell>
    );
  }
  return authed ? (
    <Console onSignedOut={() => setAuthed(false)} />
  ) : (
    <LoginForm onAuthed={() => setAuthed(true)} />
  );
}

function Shell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-page px-6 py-14 text-white">
      <div className={`mx-auto w-full ${wide ? "max-w-[720px]" : "max-w-[400px]"}`}>{children}</div>
    </div>
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
    <Shell>
      <img src={logoWhite} alt="LOOK" className="h-8 w-auto object-contain" />
      <h1 className="mt-8 font-display text-[26px] font-medium">Campaigns</h1>
      <p className="mt-1 text-[14px] text-muted">Owner access only.</p>
      <form onSubmit={submit} className="mt-7">
        <label className="mb-1.5 block text-[13px] font-medium text-body" htmlFor="admin-password">
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
    </Shell>
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
        r.simulated ? "Test simulated (no email key configured)." : `Test sent to ${testEmail.trim()}.`,
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
    <Shell wide>
      <div className="flex items-start justify-between gap-4">
        <div>
          <img src={logoWhite} alt="LOOK" className="h-7 w-auto object-contain" />
          <h1 className="mt-6 font-display text-[26px] font-medium">Send a campaign</h1>
          <p className="mt-1 text-[14px] text-muted">
            Reaches every newsletter subscriber. Preview and send yourself a test first.
          </p>
        </div>
        <button onClick={signOut} className="shrink-0 text-[13px] text-muted hover:text-white">
          Sign out
        </button>
      </div>

      <div className="mt-8 space-y-5">
        <Field label="Subject *">
          <input className={inputCls} value={fields.subject} onChange={set("subject")} placeholder="48 hours only — 20% off" />
        </Field>
        <Field label="Heading *">
          <input className={inputCls} value={fields.heading} onChange={set("heading")} placeholder="The weekend sale is on" />
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
            <input className={inputCls} value={fields.ctaLabel} onChange={set("ctaLabel")} placeholder="Shop the sale" />
          </Field>
          <Field label="Button link" hint="optional">
            <input className={inputCls} value={fields.ctaUrl} onChange={set("ctaUrl")} placeholder="https://look.ind.in/shop" />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Hero image URL" hint="optional">
            <input className={inputCls} value={fields.imageUrl} onChange={set("imageUrl")} placeholder="https://…" />
          </Field>
          <Field label="Discount code" hint="optional">
            <input className={inputCls} value={fields.discountCode} onChange={set("discountCode")} placeholder="WEEKEND20" />
          </Field>
        </div>
      </div>

      <div className="mt-6">
        <button onClick={doPreview} disabled={!ready || busy !== null} className={secondaryBtn}>
          {busy === "preview" ? "Rendering…" : "Preview"}
        </button>
      </div>

      {previewHtml && (
        <div className="mt-6">
          <p className="mb-1.5 text-[13px] font-medium text-body">Preview</p>
          <iframe
            /* Sandboxed with no allow-* tokens: the email is static, this just
               denies it scripts/forms/same-origin as defence-in-depth. */
            sandbox=""
            srcDoc={previewHtml}
            title="Email preview"
            className="h-[560px] w-full rounded-card border border-line bg-white"
          />
        </div>
      )}

      <div className="mt-8 rounded-card border border-line p-5">
        <p className="text-[14px] font-medium text-white">Send</p>
        <p className="mt-1 text-[13px] text-muted">Your password is required for every send — test or live.</p>

        <div className="mt-4">
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
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
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

        <div className="mt-5 border-t border-line pt-5">
          {!confirmSend ? (
            <button onClick={doSend} disabled={!ready || busy !== null} className={dangerBtn}>
              Send to all subscribers
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={doSend} disabled={busy !== null} className={dangerBtn}>
                {busy === "send" ? "Sending…" : "Yes — send to everyone now"}
              </button>
              <button
                onClick={() => setConfirmSend(false)}
                disabled={busy !== null}
                className="text-[13px] text-muted hover:text-white"
              >
                Cancel
              </button>
              <span className="text-[13px] text-sale">This emails your entire subscriber list.</span>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
