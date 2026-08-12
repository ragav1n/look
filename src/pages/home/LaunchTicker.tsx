import { Link } from "react-router-dom";
import { usePromo } from "@/hooks/usePromo";

/** Phrases per marquee group. Seven fills ~2550px on their own, which covers
 *  everything up to a 27" screen at natural spacing; past that the group's own
 *  min-width takes over and `justify-around` stretches the gaps (see the note
 *  on the seam below). Seven rather than five purely so an ultra-wide doesn't
 *  end up with 320px of air between phrases. */
const PER_GROUP = 7;

/* Promo ticker, directly under the hero.
   The announcement the client asked for, as moving text. Which campaign runs
   here — and whether one runs here at all — is Shopify's to say: the band only
   appears for a promo whose "Show in home ticker" is ticked. It is deliberately
   NOT a list of live discount codes; the store can have a dozen and show none
   of them here.

   Mechanics: two identical groups side by side, translated by -50% of the pair
   (i.e. exactly one group) on a linear loop, so the moment the animation
   restarts the second group is sitting where the first one began and the seam
   is invisible. Duplicate copy is hidden from assistive tech — the band's
   accessible name is on the link, said once.

   That only holds while ONE group is at least as wide as the viewport. Five
   phrases measure ~1820px, which covers a laptop and quietly fails above it:
   at 1920px the track's right edge came into view for the last fraction of
   every cycle (95px of bare red), and at 2560px for ~14s of the 34s — the band
   simply ran out of text. Hence `min-w-[100vw]` on each group: it can never be
   narrower than the screen it's scrolling across, whatever the screen is, and
   `justify-around` spends the slack on wider gaps between phrases instead of
   leaving it at the end. Adding more phrases would only move the breakpoint. */
export default function LaunchTicker() {
  const promo = usePromo();
  if (!promo?.surfaces.ticker) return null;

  const phrase = (key: number) => (
    <span key={key} className="flex shrink-0 items-center gap-3 pr-7 sm:gap-4 sm:pr-9">
      <span className="text-[12px] font-medium tracking-[0.2em] whitespace-nowrap uppercase sm:text-[13px]">
        {promo.tickerText}
      </span>
      <span className="rounded-full bg-white px-2.5 py-[3px] font-ui text-[11px] font-medium tracking-[0.1em] whitespace-nowrap text-accent sm:text-[12px]">
        Use code {promo.code}
      </span>
      {/* Diamond, not a bullet: at 12px a middot on red all but disappears. */}
      <span aria-hidden className="size-[5px] rotate-45 bg-white/70" />
    </span>
  );

  return (
    <Link
      to={promo.ctaPath}
      aria-label={`${promo.tickerText} — shop the offer with code ${promo.code}`}
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
          <div
            key={group}
            className="flex min-w-[100vw] shrink-0 items-center justify-around"
          >
            {Array.from({ length: PER_GROUP }, (_, i) => phrase(i))}
          </div>
        ))}
      </div>
    </Link>
  );
}
