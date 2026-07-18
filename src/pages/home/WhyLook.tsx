import Reveal from "@/components/ui/Reveal";

/* "Why LOOK?" — brand statement placed just above the Customer Diaries.
   Copy supplied by the brand; centered editorial block on the black theme,
   with the closing line lifted into the script accent like the About page. */
export default function WhyLook() {
  return (
    <section className="py-[80px]" aria-labelledby="why-look-heading">
      <Reveal className="mx-auto w-full max-w-[860px] px-6 text-center">
        <h2
          id="why-look-heading"
          className="font-display text-[35px] leading-[47px] font-medium text-white"
        >
          Why LOOK?
        </h2>
        <p className="mx-auto mt-4 max-w-[660px] text-[19px] leading-[31px] font-medium text-heading-soft">
          Luxury is not about exclusivity — it is about making every woman feel extraordinary.
        </p>
        <p className="mx-auto mt-5 max-w-[680px] text-[16px] leading-[27px] text-body">
          Every LOOK piece is thoughtfully crafted with premium quality, timeless design, and
          inclusive tailoring to celebrate every skin tone, every body shape, and every unique
          story.
        </p>
        <p className="mt-6 font-script text-[30px] leading-[1.25] text-accent-bright">
          Because confidence is the most beautiful thing you can wear.
        </p>
      </Reveal>
    </section>
  );
}
