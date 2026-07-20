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

/* "LOOK's Customer Diaries": real customer words on white note/diary cards,
   each with a customer picture, laid out as a masonry note-wall on the black
   theme (client request: white note style + customer pictures). Avatars are
   face crops of the catalog's own model shots, ordered to line up with the
   `reviews` array so each note pairs with a face from that product's shoot. */
const avatars = [avAnanya, avShraddha, avMeera, avSaara, avDivya, avRitika, avShobhana];

export default function HomeReviews() {
  return (
    <section className="py-[64px]" aria-labelledby="reviews-heading">
      <div className="mx-auto w-full max-w-[1200px] px-6">
        <Reveal className="text-center">
          <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Customer Love</p>
          <h2
            id="reviews-heading"
            className="mt-2 font-display text-[35px] leading-[47px] font-medium text-white"
          >
            LOOK&rsquo;s Customer Diaries
          </h2>
          <p className="mt-2 text-[16px] text-body">
            Little notes from the women who wear LOOK.
          </p>
        </Reveal>

        <div className="mt-[48px] columns-1 gap-5 sm:columns-2 lg:columns-3">
          {reviews.map((r, i) => (
            <Reveal
              key={r.id}
              variant="up"
              delay={(i % 3) * 90}
              className={`mb-5 break-inside-avoid ${i % 2 === 0 ? "sm:-rotate-1" : "sm:rotate-1"}`}
            >
              <figure className="rounded-[16px] bg-white p-6 text-black shadow-[0_12px_34px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:rotate-0">
                <div className="flex items-center gap-3">
                  <img
                    src={avatars[i % avatars.length]}
                    alt={r.author}
                    loading="lazy"
                    className="size-12 rounded-full object-cover object-top ring-2 ring-black/5"
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

                <blockquote className="mt-4 text-[15px] leading-[24px] text-neutral-700">
                  &ldquo;{r.body}&rdquo;
                </blockquote>

                {r.productName && (
                  <p className="mt-4 text-[11px] font-medium tracking-[0.06em] text-neutral-400 uppercase">
                    {r.productName}
                  </p>
                )}
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
