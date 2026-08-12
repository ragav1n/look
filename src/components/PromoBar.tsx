import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/context/ToastContext";
import { useApplyPromo } from "@/hooks/useApplyPromo";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePromo } from "@/hooks/usePromo";

/* The offer bar: one slim line above the navbar, on every page.
   ────────────────────────────────────────────────────────────────────────
   The ticker only runs on the home page and the poster only greets a visit
   once, so a shopper who lands on a product from search never met either. This
   is the surface that follows them, and it only runs for a promo whose "Show in
   top bar" is ticked.

   Deliberately NOT sticky. The navbar is `sticky top-0` (Navbar.tsx), so a bar
   above it in normal flow scrolls away and the navbar takes the top edge on its
   own — no offsets to keep in sync. Making this sticky too would mean a
   `top-[Npx]` on the header keyed to a height that changes when the sentence
   wraps at 360px, and again the moment it's dismissed. */
export default function PromoBar() {
  const promo = usePromo();
  const { apply, busy, alreadyApplied } = useApplyPromo(promo);
  const { push } = useToast();
  const navigate = useNavigate();
  /* Keyed on the CODE rather than a boolean. The store switches campaigns from
     Shopify with no deploy, and a new offer has to come back for everyone who
     dismissed the last one. */
  const [dismissed, setDismissed] = useLocalStorage("look.promoBar", { code: "" });
  const [announced, setAnnounced] = useState("");

  if (!promo?.surfaces.bar || dismissed.code === promo.code) return null;

  const onTap = async () => {
    const result = await apply();
    if (result === "applied") {
      setAnnounced(`Code ${promo.code} applied`);
      push(`${promo.code} applied to your bag.`);
      navigate("/cart");
    } else if (result === "saved") {
      push(`${promo.code} saved — it'll be waiting in your bag.`);
      navigate(promo.ctaPath);
    } else if (result === "rejected") {
      // The store's own advertised code isn't earned by this bag — a minimum,
      // most likely. Send them to the cart, where the totals and the field can
      // say more than a bar this size can.
      push(`${promo.code} doesn't apply to your bag yet.`);
      navigate("/cart");
    }
  };

  return (
    <aside aria-label="Offer" className="relative border-b border-black/15 bg-accent text-white">
      {/* px-10 rather than px-6: the dismiss button is positioned over this row,
          and at 320px a centred sentence otherwise runs underneath it. */}
      <div className="mx-auto flex max-w-[1512px] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-10 py-2 sm:px-14 lg:px-[85px]">
        <p className="text-center text-[12px] leading-[18px] font-medium tracking-[0.06em] sm:text-[13px]">
          {promo.barText}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onTap()}
          aria-label={
            alreadyApplied
              ? `${promo.code} is already applied — view your bag`
              : `Apply discount code ${promo.code}`
          }
          className="shrink-0 cursor-pointer rounded-full bg-white px-2.5 py-[3px] font-ui text-[11px] font-medium tracking-[0.1em] whitespace-nowrap text-accent transition-opacity hover:opacity-85 disabled:opacity-60 sm:text-[12px]"
        >
          {busy ? "Applying…" : promo.code}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setDismissed({ code: promo.code })}
        aria-label="Dismiss offer"
        className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-full text-white/75 transition-colors hover:bg-black/15 hover:text-white sm:right-3"
      >
        {/* Inline SVG, never an <img> of one: WebKit gives an <img> with no
            intrinsic size a zero minimum in a flex row and shrinks it to
            nothing — the bug that lost the header's cart icon on a phone. */}
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      </button>

      {/* The bar itself carries no aria-live: it is present at first paint, not
          an update, and announcing it is exactly the noise a live region should
          not make. This region is empty at rest and speaks once, on apply. */}
      <span role="status" className="sr-only">
        {announced}
      </span>
    </aside>
  );
}
