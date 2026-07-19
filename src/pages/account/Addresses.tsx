import { useState } from "react";
import type { Address, AddressInput } from "@/types";
import { createAddress, deleteAddress, getAddresses, setDefaultAddress, updateAddress } from "@/lib/customer";
import { INDIAN_STATES, stateNameFor } from "@/data/indianStates";
import { formatPhone } from "@/lib/format";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/context/ToastContext";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";

const inputCls =
  "h-[46px] w-full rounded-btn border border-line bg-surface px-4 text-[14px] text-white outline-none transition-colors focus:border-accent";

const blank = (): AddressInput => ({
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  zoneCode: "",
  pincode: "",
  phone: "",
});

export default function Addresses() {
  const { data, loading, error, reload } = useAsyncData(() => getAddresses(), []);
  const { push } = useToast();

  const [adding, setAdding] = useState(false);
  // null while adding a new address; an id while editing an existing one.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(blank());
  const [saving, setSaving] = useState(false);
  // Removal is irreversible and now server-side, so it takes two clicks.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = data ?? [];

  const startAdd = () => {
    setDraft(blank());
    setEditingId(null);
    setAdding(true);
  };

  const startEdit = (a: Address) => {
    const { id: _id, isDefault: _isDefault, ...rest } = a;
    setDraft({ ...rest, line2: rest.line2 ?? "" });
    setEditingId(a.id);
    setAdding(true);
  };

  const closeForm = () => {
    setAdding(false);
    setEditingId(null);
    setDraft(blank());
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) await updateAddress(editingId, draft);
      else await createAddress(draft);
      closeForm();
      reload();
    } catch (err) {
      /* Shopify's own validation message is more useful than anything we'd
         invent — it names the field it rejected. */
      push(err instanceof Error ? err.message : "We couldn't save this address.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await deleteAddress(id);
      setConfirmingId(null);
      reload();
    } catch (err) {
      push(err instanceof Error ? err.message : "We couldn't remove this address.");
    } finally {
      setBusyId(null);
    }
  };

  const makeDefault = async (id: string) => {
    setBusyId(id);
    try {
      await setDefaultAddress(id);
      reload();
    } catch (err) {
      push(err instanceof Error ? err.message : "We couldn't set your default address.");
    } finally {
      setBusyId(null);
    }
  };

  const set = (k: keyof AddressInput, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  /* The picker is the source of truth for both halves: Shopify writes take the
     code, and the display name comes back on reads. */
  const setState = (code: string) => setDraft((d) => ({ ...d, zoneCode: code, state: stateNameFor(code) }));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[26px] font-medium text-white">Saved Addresses</h1>
          <p className="mt-1 text-[15px] text-body">Manage your delivery addresses.</p>
        </div>
        {!adding && !loading && !error && (
          <button
            type="button"
            onClick={startAdd}
            className="h-[44px] cursor-pointer rounded-btn bg-white px-5 text-[14px] font-medium text-black transition-opacity hover:opacity-85"
          >
            + Add address
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={save} className="mt-6 rounded-card border border-line p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              className={inputCls}
              placeholder="Full name"
              required
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="Phone"
              required
              inputMode="tel"
              // `(` and `)` would need escaping under the `v` flag browsers now
              // compile `pattern` with, and an invalid pattern is ignored
              // outright — so the character class stays deliberately narrow.
              pattern="[0-9+\s\-]{10,16}"
              title="A phone number Shopify can reach, e.g. +91 91500 02116"
              value={draft.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
            <input
              className={`${inputCls} sm:col-span-2`}
              placeholder="Address line 1"
              required
              value={draft.line1}
              onChange={(e) => set("line1", e.target.value)}
            />
            <input
              className={`${inputCls} sm:col-span-2`}
              placeholder="Address line 2 (optional)"
              value={draft.line2 ?? ""}
              onChange={(e) => set("line2", e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="City"
              required
              value={draft.city}
              onChange={(e) => set("city", e.target.value)}
            />
            {/* A code, not free text — Shopify rejects an unrecognised state. */}
            <select
              className={`${inputCls} cursor-pointer ${draft.zoneCode ? "" : "text-muted"}`}
              required
              value={draft.zoneCode}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="" disabled>
                State
              </option>
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.code} className="text-white">
                  {s.name}
                </option>
              ))}
            </select>
            <input
              className={inputCls}
              placeholder="Pincode"
              required
              inputMode="numeric"
              pattern="\d{6}"
              title="A six-digit Indian pincode"
              value={draft.pincode}
              onChange={(e) => set("pincode", e.target.value)}
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="h-[44px] cursor-pointer rounded-btn bg-white px-6 text-[14px] font-medium text-black hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Save address"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="h-[44px] cursor-pointer rounded-btn border border-line px-6 text-[14px] font-medium text-body hover:text-white disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error ? (
        <LoadError
          title="We couldn't load your addresses"
          message="Something went wrong reaching the store. Nothing has been changed."
          onRetry={reload}
        />
      ) : loading ? (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <AddressCardSkeleton key={i} />
          ))}
        </div>
      ) : list.length === 0 ? (
        !adding && (
          <div className="mt-10 rounded-card bg-card p-10 text-center">
            <p className="text-[16px] font-medium text-white">No saved addresses</p>
            <p className="mt-1 text-[14px] text-body">
              Add one here and it’ll be ready at checkout.
            </p>
            <button
              type="button"
              onClick={startAdd}
              className="mt-4 cursor-pointer text-[14px] font-medium text-accent hover:underline"
            >
              Add your first address →
            </button>
          </div>
        )
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {list.map((a) => (
            <div key={a.id} className="rounded-card border border-line p-5">
              <div className="flex items-center justify-between">
                {a.isDefault ? (
                  <span className="rounded-full bg-accent-tint px-2.5 py-1 text-[12px] font-medium text-accent">
                    Default
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => makeDefault(a.id)}
                    disabled={busyId === a.id}
                    className="cursor-pointer text-[12px] font-medium text-muted transition-colors hover:text-accent disabled:opacity-60"
                  >
                    Set as default
                  </button>
                )}
              </div>
              <p className="mt-3 text-[14px] leading-[22px] text-body">
                <span className="font-medium text-white">{a.name}</span>
                <br />
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {a.city}, {a.state} {a.pincode}
                <br />
                {formatPhone(a.phone)}
              </p>
              <div className="mt-4 flex items-center gap-4 text-[13px]">
                <button
                  type="button"
                  onClick={() => startEdit(a)}
                  className="cursor-pointer font-medium text-accent hover:underline"
                >
                  Edit
                </button>
                {confirmingId === a.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => remove(a.id)}
                      disabled={busyId === a.id}
                      className="cursor-pointer font-medium text-sale hover:underline disabled:opacity-60"
                    >
                      {busyId === a.id ? "Removing…" : "Confirm remove"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="cursor-pointer text-muted hover:text-white"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(a.id)}
                    className="cursor-pointer text-muted hover:text-sale"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddressCardSkeleton() {
  return (
    <div className="rounded-card border border-line p-5">
      <Skeleton className="h-6 w-[70px] rounded-full" />
      <div className="mt-3 flex flex-col gap-2">
        <Skeleton className="h-4 w-[120px]" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[80%]" />
        <Skeleton className="h-3 w-[60%]" />
      </div>
      <div className="mt-4 flex gap-4">
        <Skeleton className="h-4 w-[40px]" />
        <Skeleton className="h-4 w-[60px]" />
      </div>
    </div>
  );
}
