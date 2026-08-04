import { useEffect, useState } from "react";
import { useUser } from "@/context/UserProvider";
import { getNewsletterPref, setNewsletterPref } from "@/lib/customer/bff";

const inputCls =
  "h-[48px] w-full rounded-btn border border-line bg-surface px-4 text-[15px] text-white outline-none transition-colors focus:border-accent";

/* Email and phone live on the customer's Shopify identity, not on anything we
   own: CustomerUpdateInput accepts firstName/lastName and nothing else, so an
   editable field for either would silently discard whatever was typed. They're
   shown read-only instead. */
/* Deliberately borderless and flatter than `inputCls` — a bordered box at the
   same height reads as an editable field and invites a click that does nothing. */
const readonlyCls =
  "flex h-[48px] items-center rounded-btn bg-white/[0.04] px-4 text-[15px] text-muted";

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[14px] font-medium text-heading-soft">{label}</span>
      <p className={readonlyCls}>{value || "Not set"}</p>
    </div>
  );
}

/**
 * The newsletter subscription, read from and written straight back to Shopify.
 *
 * New accounts land here already ticked — signing in opts you in (see
 * api/account/index.ts) — so this is where someone changes their mind without
 * having to dig an unsubscribe link out of an old email. `null` means the
 * preference couldn't be read, and the whole block stays hidden rather than
 * offering a switch that wouldn't stick.
 */
function EmailPreferences() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void getNewsletterPref().then((v) => {
      if (live) setSubscribed(v);
    });
    return () => {
      live = false;
    };
  }, []);

  if (subscribed === null) return null;

  /* Flip immediately, then settle on what the server stored — a toggle that
     waits on a round-trip before moving feels broken. */
  const toggle = async () => {
    if (saving) return;
    const next = !subscribed;
    setSubscribed(next);
    setSaving(true);
    setFailed(false);
    try {
      setSubscribed(await setNewsletterPref(next));
    } catch {
      setSubscribed(!next);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-12 max-w-[460px] border-t border-line pt-8">
      <h2 className="font-display text-[19px] font-medium text-white">Email preferences</h2>

      <label className="mt-4 flex cursor-pointer items-start gap-3 select-none">
        <input
          type="checkbox"
          checked={subscribed}
          onChange={toggle}
          disabled={saving}
          className="peer sr-only"
        />
        <span
          className="mt-[2px] flex size-[18px] shrink-0 items-center justify-center rounded-[4px] border border-line-strong text-white transition-colors peer-checked:border-accent peer-checked:bg-accent"
          aria-hidden
        >
          {subscribed && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12l4 4L19 7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span className="text-[15px] text-body transition-colors peer-checked:text-white">
          Email me when something new drops
        </span>
      </label>

      <p className="mt-2 ml-[30px] text-[13px] text-muted">
        New arrivals and the occasional note from the studio. Nothing else, and you can turn this
        off whenever you like.
      </p>

      {failed && (
        <p className="mt-3 ml-[30px] text-[13px] text-accent" role="status">
          That didn&apos;t save. Please try again.
        </p>
      )}
    </section>
  );
}

export default function Profile() {
  const { user, updateProfile } = useUser();
  const serverName = user?.name ?? "";
  const [name, setName] = useState(serverName);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  /* Track the server's value, so a save that normalises the name (or a session
     refresh) is reflected. Keyed on the server string, so it never clobbers
     mid-typing — local edits don't change `serverName`. */
  useEffect(() => {
    setName(serverName);
  }, [serverName]);

  /* Nothing to write when the field is blank or matches what's already stored —
     a blank submit would otherwise push firstName:"" lastName:"" to Shopify. */
  const trimmed = name.trim();
  const dirty = trimmed.length > 0 && trimmed !== serverName;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await updateProfile({ name: trimmed });
      setSaved(true);
    } catch {
      /* the provider raises a toast on failure */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-[26px] font-medium text-white">My Profile</h1>
      <p className="mt-1 text-[15px] text-body">Manage your personal information.</p>

      <form onSubmit={submit} className="mt-8 flex max-w-[460px] flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium text-heading-soft">Full name</span>
          <input
            className={inputCls}
            value={name}
            autoComplete="name"
            placeholder="Your name"
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
          />
          {/* Signing in with an emailed code never asks for a name, so it comes
              back empty on a first login. Say so, rather than leaving a blank
              box that looks like it failed to load. */}
          {!serverName && (
            <span className="text-[13px] text-muted">
              Signing in with an email code doesn&apos;t collect a name — add yours here.
            </span>
          )}
        </label>

        <ReadOnlyField label="Email" value={user?.email ?? ""} />
        <ReadOnlyField label="Phone" value={user?.phone ?? ""} />
        <p className="-mt-2 text-[13px] text-muted">
          Your email and phone come from your Shopify sign-in and can&apos;t be edited here.
        </p>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving || !dirty}
            className="h-[48px] cursor-pointer rounded-btn bg-white px-7 text-[15px] font-medium text-black transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && (
            <span className="text-[14px] text-accent" role="status">
              Saved ✓
            </span>
          )}
        </div>
      </form>

      <EmailPreferences />
    </div>
  );
}
