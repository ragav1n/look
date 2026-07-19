import { useEffect, useState } from "react";
import { useUser } from "@/context/UserProvider";

const inputCls =
  "h-[48px] w-full rounded-btn border border-line bg-surface px-4 text-[15px] text-white outline-none transition-colors focus:border-accent";

/* Email and phone live on the customer's Shopify identity, not on anything we
   own: CustomerUpdateInput accepts firstName/lastName and nothing else, so an
   editable field for either would silently discard whatever was typed. They're
   shown read-only instead. */
const readonlyCls =
  "flex h-[48px] items-center rounded-btn border border-line bg-surface/40 px-4 text-[15px] text-muted";

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[14px] font-medium text-heading-soft">{label}</span>
      <p className={readonlyCls}>{value || "Not set"}</p>
    </div>
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name });
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
            disabled={saving}
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
    </div>
  );
}
