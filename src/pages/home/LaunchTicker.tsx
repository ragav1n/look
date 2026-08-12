import { Link } from "react-router-dom";
import { launchOffer } from "@/config/launchOffer";

/** Phrases per marquee group. The group has to be wider than the viewport or
 *  the loop shows a gap at the seam, and one phrase is nowhere near 1512px. */
const PER_GROUP = 5;

/* TEMPORARY — launch-offer ticker, directly under the hero.
   The announcement the client asked for, as moving text. Retire it from
   src/config/launchOffer.ts.

   Mechanics: two identical groups side by side, translated by -50% of the pair
   (i.e. exactly one group) on a linear loop, so the moment the animation
   restarts the second group is sitting where the first one began and the seam
   is invisible. Duplicate copy is hidden from assistive tech — the band's
   accessible name is on the link, said once. */
export default function LaunchTicker() {
  if (!launchOffer.live) return null;

  const phrase = (key: number) => (
    <span key={key} className="flex shrink-0 items-center gap-3 pr-7 sm:gap-4 sm:pr-9">
      <span className="text-[12px] font-medium tracking-[0.2em] whitespace-nowrap uppercase sm:text-[13px]">
        LOOK goes live
      </span>
      <span className="rounded-full bg-white px-2.5 py-[3px] font-ui text-[11px] font-medium tracking-[0.1em] whitespace-nowrap text-accent sm:text-[12px]">
        Use code {launchOffer.code}
      </span>
      {/* Diamond, not a bullet: at 12px a middot on red all but disappears. */}
      <span aria-hidden className="size-[5px] rotate-45 bg-white/70" />
    </span>
  );

  return (
    <Link
      to="/shop"
      aria-label={`LOOK goes live — shop the launch offer with code ${launchOffer.code}`}
      className="group block overflow-hidden border-y border-black/15 bg-accent py-2.5 text-white"
    >
      <div
        aria-hidden
        /* Paused on hover so the code can be read (and the tap target held)
           without waiting for it to come round again. */
        className="animate-marquee flex w-max group-hover:[animation-play-state:paused]"
        style={{ animationDuration: "34s" }}
      >
        {[0, 1].map((group) => (
          <div key={group} className="flex shrink-0 items-center">
            {Array.from({ length: PER_GROUP }, (_, i) => phrase(i))}
          </div>
        ))}
      </div>
    </Link>
  );
}
