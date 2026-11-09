import { useEffect, useState } from "react";
import Fireworks from "@/components/Fireworks";
import { loadPromo } from "@/hooks/usePromo";
import { markPosterSeen, posterSeenThisSession } from "@/lib/posterSession";

/** Same beat the poster opens on, so the crackers read as a greeting rather
 *  than going off over a page that hasn't painted yet. */
const DELAY_MS = 800;

/* The crackers, without the poster.
   ────────────────────────────────────────────────────────────────────────
   When the promo has "Show in popup poster" ticked, LaunchOfferPopup fires the
   crackers itself as the poster opens, and this stays out of the way. With the
   poster switched off, this fires them on their own: once per browser session,
   on the same session flag the poster uses, so a reload doesn't set them off
   again.

   Waits on the promo lookup (loadPromo is memoised, so this is the same
   request the other promo surfaces share) because `usePromo` can't tell
   "still loading" from "no poster", and guessing wrong would fire the crackers
   twice. */
export default function GreetingCrackers() {
  const [sparkling, setSparkling] = useState(false);

  useEffect(() => {
    if (posterSeenThisSession()) return;
    let live = true;
    const delay = new Promise((r) => window.setTimeout(r, DELAY_MS));
    void Promise.all([loadPromo(), delay]).then(([promo]) => {
      if (!live || promo?.surfaces.poster) return;
      markPosterSeen();
      setSparkling(true);
    });
    return () => {
      live = false;
    };
  }, []);

  return sparkling ? <Fireworks onDone={() => setSparkling(false)} /> : null;
}
