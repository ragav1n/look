import { reviews } from "@/data/reviews";
import RatingStars from "@/components/ui/RatingStars";

const featured = ["r-1", "r-4", "r-6"];

/* User-requested section (not in Figma Home): customer reviews in the design's
   card language — card bg, stars, quote, divider, author + product. */
export default function HomeReviews() {
  const items = reviews.filter((r) => featured.includes(r.id));

  return (
    <section className="py-[72px]" aria-labelledby="reviews-heading">
      <div className="mx-auto w-full max-w-[1338px] px-6 min-[1400px]:px-0">
        <div className="text-center">
          <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Customer Love</p>
          <h2
            id="reviews-heading"
            className="mt-2 font-display text-[35px] leading-[47px] font-medium text-black"
          >
            What Our Customers Say
          </h2>
        </div>

        <div className="mt-[44px] grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-[35px]">
          {items.map((r) => (
            <figure key={r.id} className="flex flex-col rounded-card bg-card p-7">
              <RatingStars rating={r.rating} size={20} />
              <p className="mt-4 text-[18px] leading-[26px] font-medium text-black">{r.title}</p>
              <blockquote className="mt-2 flex-1 text-[15px] leading-[23px] text-body">
                “{r.body}”
              </blockquote>
              <figcaption className="mt-5 border-t border-line pt-4">
                <p className="text-[14px] font-medium text-black">
                  {r.author}
                  {r.verified && (
                    <span className="ml-2 text-[12px] font-normal text-accent">
                      ✓ Verified buyer
                    </span>
                  )}
                </p>
                {r.productName && <p className="mt-0.5 text-[13px] text-muted">{r.productName}</p>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
