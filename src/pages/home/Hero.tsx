import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getCollectionProducts } from "@/lib/catalog";
import { useAsyncData } from "@/hooks/useAsyncData";

/** Shopify collection whose products become the hero slides. Slide order is the
 *  collection's own manual order in the Shopify admin — reorder there, not here. */
const HERO_COLLECTION = "hero";
const SLIDE_MS = 7000;

/* LOOK hero.
   ────────────────────────────────────────────────────────────────────────
   Every slide comes from Shopify: the photo is the product's first image, the
   label is its title + `custom.hero_tagline` metafield, and the whole photo
   links to that product. Nothing here is a local asset — to change the hero,
   edit the "Hero" collection in Shopify.

   Full-bleed height: on desktop the hero fills the viewport below the 72px
   sticky navbar so the editorial photography is shown at full height rather
   than as a thin crop. */
export default function Hero() {
  const { data } = useAsyncData(() => getCollectionProducts(HERO_COLLECTION, 6), []);
  const slides = data ?? [];
  const [slide, setSlide] = useState(0);

  // Collection length isn't known on first render, so clamp when it arrives.
  useEffect(() => setSlide(0), [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  const current = slides[slide];

  return (
    <section
      className="relative h-[540px] overflow-hidden bg-black sm:h-[640px] lg:h-[calc(100vh-72px)] lg:min-h-[680px]"
      aria-label="Featured"
    >
      {/* ===== BACKGROUND MEDIA — Shopify product imagery ===== */}
      <div className="absolute inset-0" aria-hidden>
        {slides.map((p, i) => (
          <div
            key={p.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              i === slide ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={p.images[0]}
              alt=""
              /* Framed slightly above centre: these are full-length portraits, and
                 a dead-centre crop cuts the model's head at wide viewports. */
              className={`h-full w-full object-cover object-[50%_30%] ${
                i === slide ? "animate-kenburns" : ""
              }`}
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
      {current && (
        <Link
          to={`/shop/${current.slug}`}
          aria-label={`Shop the ${current.name}`}
          className="absolute inset-0 z-10"
        />
      )}

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

        {/* Which piece is on screen. Keyed on the slug so it re-runs its entrance
            animation on every slide change. */}
        {current && (
          <div key={current.slug} className="animate-fade-up mt-9">
            <p className="text-[13px] leading-[18px] font-medium tracking-[0.14em] text-white uppercase">
              {current.name}
            </p>
            {current.heroTagline && (
              <p className="mt-1 text-[13px] leading-[18px] text-white/60">{current.heroTagline}</p>
            )}
          </div>
        )}

        {/* slide indicators — advance the background media */}
        {slides.length > 1 && (
          <div className="pointer-events-auto mt-4 flex w-fit items-center gap-2">
            {slides.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-label={`Show ${p.name}`}
                aria-current={i === slide}
                onClick={() => setSlide(i)}
                className={`h-[7px] cursor-pointer rounded-full transition-all duration-500 ${
                  i === slide ? "w-[26px] bg-white" : "w-[7px] bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
