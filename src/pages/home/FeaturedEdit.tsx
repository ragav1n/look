import { getBestSellers } from "@/lib/catalog";
import { useAsyncData } from "@/hooks/useAsyncData";
import ExecutiveImpactCarousel from "@/components/ui/executive-impact-carousel";
import Reveal from "@/components/ui/Reveal";

/* "Shop the Edit" — editorial product carousel fed by live/fixture best-sellers.
   Scrolls horizontally (arrows, drag, auto-advance); hover swaps product → styled shot. */
export default function FeaturedEdit() {
  const { data } = useAsyncData(() => getBestSellers(), []);
  const products = data ?? [];

  if (products.length === 0) return null;

  return (
    <section
      id="the-edit"
      className="scroll-mt-[87px] overflow-hidden py-[64px]"
      aria-labelledby="edit-heading"
    >
      <Reveal className="mx-auto w-full max-w-[1338px] px-6 text-center min-[1400px]:px-0">
        <p className="text-[12px] tracking-[0.08em] text-accent uppercase">The Edit</p>
        <h2
          id="edit-heading"
          className="mt-2 font-display text-[35px] leading-[47px] font-medium text-black"
        >
          Shop the Edit
        </h2>
        <p className="mt-2 text-[16px] text-body">Swipe through — hover any piece to see it styled.</p>
      </Reveal>
      <Reveal variant="fade" delay={120} className="mt-9">
        <ExecutiveImpactCarousel products={products} />
      </Reveal>
    </section>
  );
}
