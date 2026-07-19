import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
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
  // A product whose media is still processing would render an empty slide.
  const slides = (data ?? []).filter((p) => p.images[0]);
  const [slide, setSlide] = useState(0);
  // Bumped on manual selection to restart the autoplay window from the tap, so
  // the interval doesn't fire ~instantly after and yank the slide off the one
  // the user just chose.
  const [interaction, setInteraction] = useState(0);
  const selectSlide = (i: number) => {
    setSlide(i);
    setInteraction((n) => n + 1);
  };
  const step = (delta: number) => selectSlide((slide + delta + slides.length) % slides.length);

  // Collection length isn't known on first render, so clamp when it arrives.
  useEffect(() => setSlide(0), [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [slides.length, interaction]);

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
            /* Short crossfade on purpose: while it runs, both photos are
               superimposed, which reads as a blurry double-exposure. */
            className={`absolute inset-0 transition-opacity duration-500 ${
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

      {/* Legibility scrim. Deliberately light and confined to the lower third —
          the photography is the point, so it only darkens enough to carry the
          copy that sits on it. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

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

      {/* prev/next — sit above the whole-photo link so they stay clickable.
          The background media crossfades on change, so this eases, not pops. */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous slide"
            className="absolute top-1/2 left-3 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/45 lg:left-6"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next slide"
            className="absolute top-1/2 right-3 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/45 lg:right-6"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}

      {/* content sits in the lower portion of the hero */}
      <div className="pointer-events-none relative z-20 mx-auto flex h-full w-full max-w-[1512px] flex-col justify-end px-6 pb-14 lg:px-[87px] lg:pb-[72px]">
        <div className="max-w-[760px]">
          <div
            className="animate-fade-up flex flex-wrap items-center gap-4"
            style={{ animationDelay: "0.14s" }}
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
          <div
            key={current.slug}
            className="animate-fade-up mt-9 [text-shadow:0_1px_14px_rgba(0,0,0,0.75)]"
          >
            <p className="text-[13px] leading-[18px] font-medium tracking-[0.14em] text-white uppercase">
              {current.name}
            </p>
            {current.heroTagline && (
              <p className="mt-1 text-[13px] leading-[18px] text-white/75">{current.heroTagline}</p>
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
                onClick={() => selectSlide(i)}
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
