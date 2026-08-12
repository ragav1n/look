import { useState } from "react";
import type { Promo } from "@/types";
import { useCart } from "@/context/CartContext";

/** What a tap on a promo chip did.
 *  - `applied` — the code is on the bag and the totals have moved.
 *  - `saved`   — there was no bag yet, so it's parked for the next add.
 *  - `rejected`— Shopify won't honour it for what's in the bag (a minimum,
 *                usually). The store advertised it, so this is worth saying
 *                out loud rather than swallowing.
 *  - `failed`  — a system problem; CartContext has already toasted it. */
export type PromoApplyResult = "applied" | "saved" | "rejected" | "failed";

/** One tap, one code, from whichever surface is carrying the promo.
 *
 *  Every caller needs the same three-way branch — bag, no bag, already on —
 *  and getting it wrong is invisible until a shopper is at checkout, so it
 *  lives here rather than in each surface. */
export function useApplyPromo(promo: Promo | null) {
  const { cart, applyDiscount, stashDiscount } = useCart();
  const [busy, setBusy] = useState(false);

  const alreadyApplied = Boolean(
    promo &&
      cart.discount?.codes.some(
        (c) => c.applicable && c.code.toLowerCase() === promo.code.toLowerCase(),
      ),
  );

  const apply = async (): Promise<PromoApplyResult> => {
    if (!promo) return "failed";
    if (alreadyApplied) return "applied";
    /* Nothing to put it on. Shopify marks even a good code inapplicable on an
       EMPTY cart, so asking would produce a rejection that says nothing true
       about the code — park it instead, and the next add-to-cart claims it.
       Keyed on the quantity, not on `cart.id`: emptying a bag item by item
       leaves the id behind, and that cart is just as empty as no cart at all. */
    if (!cart.id || cart.totalQuantity === 0) {
      stashDiscount(promo.code);
      return "saved";
    }
    setBusy(true);
    const outcome = await applyDiscount(promo.code);
    setBusy(false);
    if (outcome === "applied") return "applied";
    return outcome === "invalid" ? "rejected" : "failed";
  };

  return { apply, busy, alreadyApplied };
}
