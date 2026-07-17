import { getBestSellers } from "@/lib/catalog";
import { useAsyncData } from "@/hooks/useAsyncData";
import ExecutiveImpactCarousel from "@/components/ui/executive-impact-carousel";

/* "Shop the Edit" — editorial product showcase using the 21st.dev executive
   carousel, fed by live/fixture best-sellers. Hover swaps product → styled shot. */
export default function FeaturedEdit() {
  const { data } = useAsyncData(() => getBestSellers(), []);
  const products = data ?? [];

  // GSAP needs the cards present at mount, so render only once products load.
  if (products.length === 0) return null;

  return (
    <section className="py-[56px]" aria-labelledby="edit-heading">
      <div className="mx-auto w-full max-w-[1338px] px-6 text-center min-[1400px]:px-0">
        <p className="text-[12px] tracking-[0.08em] text-accent uppercase">The Edit</p>
        <h2
          id="edit-heading"
          className="mt-2 font-display text-[35px] leading-[47px] font-medium text-black"
        >
          Shop the Edit
        </h2>
        <p className="mt-2 text-[16px] text-body">Hover any piece to see it styled.</p>
      </div>
      <div className="mt-8">
        <ExecutiveImpactCarousel products={products} />
      </div>
    </section>
  );
}
