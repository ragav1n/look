import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import heroModel1 from "@/assets/hero-model-1.jpg";
import heroModel2 from "@/assets/hero-model-2.jpg";
import heroThumb from "@/assets/hero-carousel-thumb.jpg";
import iconArrow from "@/assets/icon-arrow-carousel.svg";

const slides = [heroBg, heroModel1, heroModel2];

/* Figma hero (2007:3269): 750px, full-bleed image, script headline 65px,
   sub 31px ExtraLight lowercase, two CTAs, side arrows, dots, preview card.
   "Visual movement" (user brief): ken-burns drift, crossfade slides,
   staggered text entrance, floating preview card. */
export default function Hero() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative h-[680px] overflow-hidden bg-[#efe9e2] lg:h-[750px]" aria-label="Featured">
      {slides.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === slide ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== slide}
        >
          <img
            src={src}
            alt=""
            className={`h-full w-full object-cover ${i === 0 ? "object-center" : "object-[70%_20%]"} ${
              i === slide ? "animate-kenburns" : ""
            }`}
          />
        </div>
      ))}
      {/* soft scrim so headline text stays readable over photography */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/25 to-transparent" />

      <div className="relative mx-auto flex h-full w-full max-w-[1512px] flex-col justify-center px-6 pb-16 lg:px-[87px]">
        <div className="max-w-[855px]">
          <h1 className="animate-fade-up font-script text-[48px] leading-[1.15] lg:text-[65px]">
            <span className="text-accent-bright">Elevate </span>
            <span className="text-black">Your Style</span>
          </h1>
          <p
            className="animate-fade-up mt-3 text-[22px] font-extralight tracking-[0.02em] text-black lowercase lg:text-[31px]"
            style={{ animationDelay: "0.15s" }}
          >
            MODERN WESTERN ESSENTIALS
          </p>
          <p
            className="animate-fade-up mt-6 max-w-[520px] text-[16px] leading-[22px] text-body"
            style={{ animationDelay: "0.3s" }}
          >
            Step into effortless fashion with our modern western wear collection. From timeless
            denim to sleek everyday outfits, discover pieces designed for comfort, confidence, and
            contemporary style.
          </p>
          <div
            className="animate-fade-up mt-8 flex flex-wrap items-center gap-[29px]"
            style={{ animationDelay: "0.45s" }}
          >
            <Link
              to="/shop"
              className="inline-flex w-[157px] items-center justify-center rounded-btn bg-black px-5 py-3 text-[16px] leading-6 font-medium text-white shadow-xs transition-opacity hover:opacity-85"
            >
              Shop Now
            </Link>
            <Link
              to="/shop"
              className="inline-flex w-[169px] items-center justify-center rounded-btn border border-body px-5 py-3 text-[16px] leading-6 font-medium text-body transition-colors hover:border-black hover:text-black"
            >
              Explore Collection
            </Link>
          </div>
        </div>

        {/* floating next-slide preview card (Figma 2007:3284) */}
        <button
          type="button"
          onClick={() => setSlide((s) => (s + 1) % slides.length)}
          aria-label="Next slide preview"
          className="animate-float absolute right-[60px] bottom-[120px] hidden h-[220px] w-[150px] cursor-pointer overflow-hidden rounded-[16px] shadow-[0_18px_40px_rgba(0,0,0,0.28)] xl:block"
        >
          <img
            src={slide === slides.length - 1 ? heroThumb : slides[(slide + 1) % slides.length]}
            alt=""
            className="h-full w-full object-cover object-top"
          />
        </button>

        {/* side arrows (Figma 2007:3286) */}
        <div className="pointer-events-none absolute inset-x-[20px] top-1/2 hidden -translate-y-1/2 items-center justify-between lg:flex">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => setSlide((s) => (s - 1 + slides.length) % slides.length)}
            className="pointer-events-auto flex size-[39px] cursor-pointer items-center justify-center rounded-full bg-[rgba(120,120,120,0.2)] backdrop-blur-sm transition-colors hover:bg-[rgba(120,120,120,0.4)]"
          >
            <img src={iconArrow} alt="" className="size-[29px] rotate-180" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => setSlide((s) => (s + 1) % slides.length)}
            className="pointer-events-auto flex size-[39px] cursor-pointer items-center justify-center rounded-full bg-[rgba(120,120,120,0.2)] backdrop-blur-sm transition-colors hover:bg-[rgba(120,120,120,0.4)]"
          >
            <img src={iconArrow} alt="" className="size-[29px]" />
          </button>
        </div>

        {/* dots (Figma 2007:3636) */}
        <div className="absolute bottom-[26px] left-1/2 flex -translate-x-1/2 items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === slide}
              onClick={() => setSlide(i)}
              className={`h-[9px] cursor-pointer rounded-full transition-all duration-500 ${
                i === slide ? "w-[26px] bg-black" : "w-[9px] bg-black/30 hover:bg-black/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
