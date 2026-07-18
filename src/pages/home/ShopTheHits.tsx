import { getAllProducts } from "@/lib/catalog";
import { useAsyncData } from "@/hooks/useAsyncData";
import Reveal from "@/components/ui/Reveal";
import StaggeredCarousel from "@/components/ui/staggered-carousel";

/* "Shop the Hits" — our most-loved pieces, ranked by customer rating, shown as
   a staggered three-column product wall. Sits just above Price Drop. */
export default function ShopTheHits() {
  const { data } = useAsyncData(() => getAllProducts(), []);
  const hits = [...(data ?? [])]
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, 9);

  // Need at least a couple of pieces to make the wall worthwhile.
  if (hits.length < 3) return null;

  /* Rendered inside the pinned viewport so it stays with the wall while it
     scrolls, rather than disappearing the moment the pin engages. */
  const heading = (
    <Reveal className="text-center">
      <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Most Loved</p>
      <h2
        id="hits-heading"
        className="mt-2 font-display text-[35px] leading-[47px] font-medium text-white"
      >
        Shop the Hits
      </h2>
      <p className="mt-2 text-[16px] text-body">The pieces our customers keep coming back to.</p>
    </Reveal>
  );

  return (
    <section className="pt-[84px] pb-[84px]" aria-labelledby="hits-heading">
      <StaggeredCarousel products={hits} heading={heading} />
    </section>
  );
}
