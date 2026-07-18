import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import heroModel1 from "@/assets/hero-model-1.jpg";
import heroModel2 from "@/assets/hero-model-2.jpg";

/* Each hero slide links to the product it shows, so clicking the photo opens
   that piece. `productSlug` must match a catalog handle (see the Shop URLs) —
   update these whenever the hero photography changes. */
const slides: { src: string; productSlug: string }[] = [
  { src: heroBg, productSlug: "red-kurta-set" },
  { src: heroModel1, productSlug: "crimson-coord-set" },
  { src: heroModel2, productSlug: "sage-coord-set" },
];

/* LOOK hero.
   ────────────────────────────────────────────────────────────────────────
   VIDEO-READY: the background lives in a single self-contained media layer
   (the `.hero-media` block below). To swap the rotating photos for a promo
   video later, replace ONLY that block with a muted autoplay loop, e.g.:

     <video className="h-full w-full object-cover" autoPlay muted loop playsInline
            poster={heroBg} src={promoVideo} />

   The dark overlay, headline, CTA and dots don't depend on it, so nothing
   else needs to change. (No video is wired up yet.)

   Full-bleed height: on desktop the hero fills the viewport below the 72px
   sticky navbar so the editorial photography is shown at full height rather
   than as a thin crop. */
export default function Hero() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      className="relative h-[540px] overflow-hidden bg-black sm:h-[640px] lg:h-[calc(100vh-72px)] lg:min-h-[680px]"
      aria-label="Featured"
    >
      {/* ===== BACKGROUND MEDIA (swap for <video> later) ===== */}
      <div className="hero-media absolute inset-0" aria-hidden>
        {slides.map(({ src }, i) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              i === slide ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={src}
              alt=""
              className={`h-full w-full object-cover ${
                i === 0 ? "object-center" : "object-[70%_20%]"
              } ${i === slide ? "animate-kenburns" : ""}`}
            />
          </div>
        ))}
      </div>

      {/* dark overlay — bottom-weighted so the low-set headline stays legible */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

      {/* Whole-photo link to the piece on show. Sits above the media but below
          the content layer, so the headline, CTA and dots stay clickable
          (wrapping them in this link would nest interactive elements). */}
      <Link
        to={`/shop/${slides[slide].productSlug}`}
        aria-label="Shop the look in this photo"
        className="absolute inset-0 z-10"
      />

      {/* content sits in the lower portion of the hero */}
      <div className="pointer-events-none relative z-20 mx-auto flex h-full w-full max-w-[1512px] flex-col justify-end px-6 pb-14 lg:px-[87px] lg:pb-[72px]">
        <div className="max-w-[760px]">
          <p className="animate-fade-up text-[13px] font-medium tracking-[0.22em] text-accent uppercase">
            Modern Western Essentials
          </p>
          <h1
            className="animate-fade-up mt-3 font-display text-[40px] leading-[1.02] font-semibold text-white lg:text-[62px]"
            style={{ animationDelay: "0.1s" }}
          >
            Style that speaks
            <span className="mt-1 block font-script text-[36px] leading-[1.1] font-normal text-accent-bright lg:text-[54px]">
              before you do.
            </span>
          </h1>
          <p
            className="animate-fade-up mt-5 max-w-[540px] text-[15px] leading-[24px] text-white/80 lg:text-[17px]"
            style={{ animationDelay: "0.28s" }}
          >
            Kurta sets and coord sets, thoughtfully crafted with premium fabric and inclusive
            tailoring — made to make every woman feel extraordinary.
          </p>
          <div
            className="animate-fade-up mt-7 flex flex-wrap items-center gap-4"
            style={{ animationDelay: "0.42s" }}
          >
            <Link
              to="/shop"
              className="group pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-medium text-black transition-all duration-300 hover:opacity-90"
            >
              Shop Now
              <ArrowRight className="size-[18px] transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* slide indicators — advance the background media */}
        <div className="pointer-events-auto mt-7 flex w-fit items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === slide}
              onClick={() => setSlide(i)}
              className={`h-[7px] cursor-pointer rounded-full transition-all duration-500 ${
                i === slide ? "w-[26px] bg-white" : "w-[7px] bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
