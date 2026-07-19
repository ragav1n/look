import { useState } from "react";
import { useUser } from "@/context/UserProvider";

const inputCls =
  "h-[48px] w-full rounded-btn border border-line bg-surface px-4 text-[15px] text-white outline-none transition-colors focus:border-accent";

export default function Profile() {
  const { user, updateProfile } = useUser();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name, email, phone });
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
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium text-heading-soft">Email</span>
          <input
            type="email"
            className={inputCls}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium text-heading-soft">Phone</span>
          <input
            type="tel"
            className={inputCls}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setSaved(false);
            }}
          />
        </label>

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
