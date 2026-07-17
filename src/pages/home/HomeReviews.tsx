import { reviews } from "@/data/reviews";
import { StaggerTestimonials } from "@/components/ui/stagger-testimonials";
import Reveal from "@/components/ui/Reveal";

/* User-requested section (not in Figma Home): customer reviews rendered with the
   21st.dev stagger-testimonials component, adapted to LOOK's tokens and fed by
   the brand's real review content. */
const items = reviews.map((r) => ({
  id: r.id,
  quote: r.body,
  author: r.author,
  context: r.productName,
}));

export default function HomeReviews() {
  return (
    <section className="py-[56px]" aria-labelledby="reviews-heading">
      <div className="mx-auto w-full max-w-[1338px] px-6 min-[1400px]:px-0">
        <Reveal className="text-center">
          <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Customer Love</p>
          <h2
            id="reviews-heading"
            className="mt-2 font-display text-[35px] leading-[47px] font-medium text-black"
          >
            What Our Customers Say
          </h2>
        </Reveal>
      </div>
      <Reveal variant="fade" delay={120} className="mt-4">
        <StaggerTestimonials items={items} />
      </Reveal>
    </section>
  );
}
