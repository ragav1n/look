import { useState } from "react";
import type { Address } from "@/types";
import { addresses as seedAddresses } from "@/lib/fixtures/account";

const inputCls =
  "h-[46px] w-full rounded-btn border border-line bg-surface px-4 text-[14px] text-white outline-none transition-colors focus:border-accent";

const blank = (): Omit<Address, "id"> => ({
  label: "Home",
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
});

export default function Addresses() {
  const [list, setList] = useState<Address[]>(seedAddresses);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(blank());

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    setList((prev) => [...prev, { ...draft, id: `addr-${Date.now()}` }]);
    setDraft(blank());
    setAdding(false);
  };

  const remove = (id: string) => setList((prev) => prev.filter((a) => a.id !== id));
  const set = (k: keyof Omit<Address, "id">, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[26px] font-medium text-white">Saved Addresses</h1>
          <p className="mt-1 text-[15px] text-body">Manage your delivery addresses.</p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="h-[44px] cursor-pointer rounded-btn bg-white px-5 text-[14px] font-medium text-black transition-opacity hover:opacity-85"
          >
            + Add address
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={add} className="mt-6 rounded-card border border-line p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input className={inputCls} placeholder="Full name" required value={draft.name} onChange={(e) => set("name", e.target.value)} />
            <input className={inputCls} placeholder="Phone" required value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
            <input className={`${inputCls} sm:col-span-2`} placeholder="Address line 1" required value={draft.line1} onChange={(e) => set("line1", e.target.value)} />
            <input className={`${inputCls} sm:col-span-2`} placeholder="Address line 2 (optional)" value={draft.line2} onChange={(e) => set("line2", e.target.value)} />
            <input className={inputCls} placeholder="City" required value={draft.city} onChange={(e) => set("city", e.target.value)} />
            <input className={inputCls} placeholder="State" required value={draft.state} onChange={(e) => set("state", e.target.value)} />
            <input className={inputCls} placeholder="Pincode" required value={draft.pincode} onChange={(e) => set("pincode", e.target.value)} />
            <input className={inputCls} placeholder="Label (Home / Work)" value={draft.label} onChange={(e) => set("label", e.target.value)} />
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" className="h-[44px] cursor-pointer rounded-btn bg-white px-6 text-[14px] font-medium text-black hover:opacity-85">
              Save address
            </button>
            <button type="button" onClick={() => setAdding(false)} className="h-[44px] cursor-pointer rounded-btn border border-line px-6 text-[14px] font-medium text-body hover:text-white">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {list.map((a) => (
          <div key={a.id} className="rounded-card border border-line p-5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-accent-tint px-2.5 py-1 text-[12px] font-medium text-accent">
                {a.label}
              </span>
              {a.isDefault && <span className="text-[12px] font-medium text-muted">Default</span>}
            </div>
            <p className="mt-3 text-[14px] leading-[22px] text-body">
              <span className="font-medium text-white">{a.name}</span>
              <br />
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}, {a.state} {a.pincode}
              <br />
              {a.phone}
            </p>
            <div className="mt-4 flex gap-4 text-[13px]">
              <button type="button" className="cursor-pointer font-medium text-accent hover:underline">
                Edit
              </button>
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="cursor-pointer text-muted hover:text-sale"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
