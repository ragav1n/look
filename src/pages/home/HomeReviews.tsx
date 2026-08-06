import { useRef, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { reviews } from "@/data/reviews";
import RatingStars from "@/components/ui/RatingStars";
import Reveal from "@/components/ui/Reveal";
import avAnanya from "@/assets/review-ananya.jpg";
import avShraddha from "@/assets/review-shraddha.jpg";
import avMeera from "@/assets/review-meera.jpg";
import avSaara from "@/assets/review-saara.jpg";
import avDivya from "@/assets/review-divya.jpg";
import avRitika from "@/assets/review-ritika.jpg";
import avShobhana from "@/assets/review-shobhana.jpg";
import avTanvi from "@/assets/review-tanvi.jpg";
import avNandini from "@/assets/review-nandini.jpg";
import avPreethi from "@/assets/review-preethi.jpg";

/* "LOOK's Customer Diaries": real customer words on white note/diary cards,
   each with a customer picture, laid out as a masonry note-wall on the black
   theme (client request: white note style + customer pictures). Avatars are
   face crops of the catalog's own model shots, keyed by review id so the wall
   can be re-ordered or filtered without a note picking up a stranger's face. */
const avatars: Record<string, string> = {
  "r-1": avAnanya,
  "r-2": avShraddha,
  "r-3": avMeera,
  "r-4": avSaara,
  "r-5": avDivya,
  "r-6": avRitika,
  "r-7": avShobhana,
  "r-8": avTanvi,
  "r-9": avNandini,
  "r-10": avPreethi,
};

/* The wall is a 3-column masonry, so it only bottoms out evenly on a multiple
   of three. These nine are all verified buyers, which keeps the badge reading
   consistently on every note, and the ratings stay mixed (two 4.5s among the
   fives) so the wall doesn't look like a scrubbed all-perfect one. Meera (r-3)
   is the one unverified review and is deliberately out; every review stays in
   `reviews` for the product pages.

   Order is art-directed, and a multi-column layout fills top-to-bottom before
   it wraps, so this list reads as column one, then two, then three — NOT as
   rows. Saara (r-4) and Shobhana (r-7) sit second in their columns to put them
   in the middle and right of the second row. The tail of each column is picked
   to keep the three columns close in height. */
const WALL_ORDER = [
  "r-1", "r-2", "r-9", // Ananya, Shraddha, Nandini
  "r-5", "r-4", "r-6", // Divya, Saara, Ritika
  "r-8", "r-7", "r-10", // Tanvi, Shobhana, Preethi
];
const wall = WALL_ORDER.flatMap((id) => reviews.find((r) => r.id === id) ?? []);

/** Rail gap in px (gap-4), needed to work out which note is parked. */
const GAP = 16;

/** Averaged over the wall, whose notes are all verified buyers. */
const AVERAGE = wall.reduce((sum, r) => sum + r.rating, 0) / wall.length;

export default function HomeReviews() {
  /* Which note the phone rail is parked on, so the dots can track it. The wall
     above sm doesn't scroll, so this stays at 0 and the dots stay hidden. */
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const onRailScroll = () => {
    const rail = railRef.current;
    const first = rail?.firstElementChild as HTMLElement | null;
    if (!rail || !first) return;
    const step = first.offsetWidth + GAP;
    setActive(Math.min(wall.length - 1, Math.max(0, Math.round(rail.scrollLeft / step))));
  };

  return (
    <section className="py-[64px]" aria-labelledby="reviews-heading">
      <div className="mx-auto w-full max-w-[1200px] px-6">
        <Reveal className="text-center">
          <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Customer Love</p>
          <h2
            id="reviews-heading"
            className="mt-2 font-display text-[28px] leading-[38px] font-medium text-white sm:text-[35px] sm:leading-[47px]"
          >
            LOOK&rsquo;s Customer Diaries
          </h2>
          <p className="mt-2 text-[16px] text-body">
            Little notes from the women who wear LOOK.
          </p>

          {/* The wall says "lots of happy customers" at a glance; one note at a
              time on a phone can't, so state it outright above the rail. */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 sm:hidden">
            <RatingStars rating={AVERAGE} size={14} />
            <span className="text-[13px] font-semibold text-white">{AVERAGE.toFixed(1)}</span>
            <span className="text-[13px] text-muted">· {wall.length} verified buyers</span>
          </div>
        </Reveal>

        {/* Phones get a swipe rail, not the wall: nine stacked note cards made
            the section taller than the rest of the home page put together.
            The next card peeks past the edge so the swipe is discoverable.
            From sm up it's the masonry note-wall as before. */}
        <div
          ref={railRef}
          onScroll={onRailScroll}
          className="no-scrollbar -mx-6 mt-[28px] flex snap-x snap-mandatory scroll-px-6 items-start gap-4 overflow-x-auto px-6 pt-3 pb-2 sm:mx-0 sm:mt-[48px] sm:block sm:columns-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pt-0 lg:columns-3"
        >
          {wall.map((r, i) => (
            <Reveal
              key={r.id}
              variant="up"
              delay={(i % 3) * 90}
              amount={0.05}
              className={`w-[80%] shrink-0 snap-start break-inside-avoid sm:mb-5 sm:w-auto sm:shrink ${
                i % 2 === 0 ? "sm:-rotate-1" : "sm:rotate-1"
              }`}
            >
              {/* The wall gets its charm from tilt and overlap, which the rail
                  can't do — so each note carries its own: a pinned tilt, a
                  torn-corner quote mark, and the piece it's about as a chip. */}
              <figure
                className={`relative rounded-[16px] bg-white p-5 text-black shadow-[0_12px_34px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:rotate-0 sm:rotate-0 sm:p-6 ${
                  i % 2 === 0 ? "-rotate-[0.8deg]" : "rotate-[0.8deg]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={avatars[r.id]}
                    alt={r.author}
                    loading="lazy"
                    className="size-10 rounded-full object-cover object-top ring-2 ring-black/5 sm:size-12"
                  />
                  <div className="min-w-0">
                    <figcaption className="flex items-center gap-1.5 text-[15px] font-semibold text-neutral-900">
                      {r.author}
                      {r.verified && (
                        <BadgeCheck className="size-[15px] text-accent" aria-label="Verified buyer" />
                      )}
                    </figcaption>
                    <RatingStars rating={r.rating} size={14} className="mt-1" />
                  </div>
                </div>

                {/* Every review carries a headline the wall never showed. On a
                    phone it's the thing that makes a note scannable in the
                    second it's on screen, so the rail leads with it. */}
                <p className="mt-3 font-display text-[17px] leading-[23px] font-semibold text-neutral-900 sm:hidden">
                  {r.title}
                </p>

                <blockquote className="mt-2 text-[13px] leading-[20px] text-neutral-600 sm:mt-4 sm:text-[15px] sm:leading-[24px] sm:text-neutral-700">
                  &ldquo;{r.body}&rdquo;
                </blockquote>

                {r.productName && (
                  <p className="mt-3 inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium tracking-[0.06em] text-neutral-500 uppercase sm:mt-4 sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0 sm:text-[11px] sm:text-neutral-400">
                    {r.productName}
                  </p>
                )}
              </figure>
            </Reveal>
          ))}
        </div>

        {/* Position for the rail — without it, a phone can't tell how much of
            the wall is left. Decorative: the rail itself is the control. */}
        <div className="mt-5 flex justify-center gap-1.5 sm:hidden" aria-hidden>
          {wall.map((r, i) => (
            <span
              key={r.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? "w-5 bg-accent" : "w-1.5 bg-white/25"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
