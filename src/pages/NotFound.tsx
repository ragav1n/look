import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getCollectionProducts, getNewArrivals } from "@/lib/catalog";
import { useAsyncData } from "@/hooks/useAsyncData";
import ProductCard from "@/components/product/ProductCard";
import Reveal from "@/components/ui/Reveal";

/* Same curated collection the homepage hero draws from: those photos are the
   ones framed for full-bleed, which is exactly what this page needs. */
const HERO_COLLECTION = "hero";

/* Film grain. A single tiling SVG as a data URI — no asset to ship, and the CSP
   already allows `img-src data:`. At 5% over black it stops the large flat
   areas from banding and gives the page a printed, editorial feel. */
const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

/** Pointer position within the element, as -0.5…0.5 on each axis. Drives the
 *  parallax. rAF-throttled so a fast mouse can't outpace the paint, and inert
 *  for reduced-motion or non-hover (touch) devices, where it would only ever
 *  fire on tap and jerk the layout. */
function usePointerParallax<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const frame = useRef(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover)").matches) return;

    const onMove = (e: PointerEvent) => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const r = el.getBoundingClientRect();
        setOffset({
          x: (e.clientX - r.left) / r.width - 0.5,
          y: (e.clientY - r.top) / r.height - 0.5,
        });
      });
    };
    const onLeave = () => setOffset({ x: 0, y: 0 });

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  return { ref, offset };
}

/* 404.
   ────────────────────────────────────────────────────────────────────────
   A dead end is still a first impression, so this one is built like a hero
   rather than a system message: a full-height stage with live catalog
   photography behind it, and the numerals cut out of that same photograph via
   `background-clip: text`. Moving the pointer pans the photo inside the
   numerals one way and the backdrop the other, which reads as depth.

   Every layer degrades on its own: no catalog (offline, API down) leaves a
   white-to-red gradient in the numerals and a plain black stage, and the
   photo is layered *over* that gradient rather than replacing it, so even a
   broken image URL can't leave the numerals invisible.

   Below the fold the page earns its keep: four real products, because the
   point of a 404 is to send someone somewhere better, not to apologise. */
export default function NotFound() {
  const location = useLocation();
  const { ref, offset } = usePointerParallax<HTMLElement>();

  const { data } = useAsyncData(
    () =>
      Promise.all([
        getCollectionProducts(HERO_COLLECTION, 4).catch(() => []),
        getNewArrivals().catch(() => []),
      ]).then(([hero, fresh]) => ({ hero, fresh })),
    [],
  );

  /* One photo, picked from the attempted path. Hero shots first, new arrivals
     as backup. Hashing the path rather than rolling a random number keeps the
     choice pure — this component re-renders on every pointer frame, and a
     random pick would reshuffle the backdrop as the mouse moves — while still
     varying the photo from one broken link to the next. */
  const pool = [...(data?.hero ?? []), ...(data?.fresh ?? [])]
    .map((p) => p.images[0])
    .filter(Boolean);
  const hash = [...location.pathname].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const photo = pool.length > 0 ? pool[hash % pool.length] : undefined;
  /* Deliberately a *different* frame in the glyphs than on the wall behind
     them. Filling the numerals with the same photo they sit on lines the two
     copies up into camouflage and the cut-out disappears. */
  const fill = pool.length > 1 ? pool[(hash + 1) % pool.length] : photo;

  const picks = (data?.fresh ?? []).filter((p) => p.images[0]).slice(0, 4);

  /* A soft-404 (Vercel rewrites every unknown path to index.html with a 200)
     is still a real 404 to a shopper, so at minimum keep it out of the index
     and off the tab title. Both are restored on unmount because no other page
     manages either — leaving them set would follow the visitor around the
     site after they navigate away. */
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Page not found | LOOK";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => {
      document.title = previousTitle;
      robots.remove();
    };
  }, []);

  // Foreground and backdrop travel in opposite directions; the numerals move
  // furthest, so they read as the nearest plane.
  const shift = (px: number) => `translate3d(${offset.x * px}px, ${offset.y * px * 0.7}px, 0)`;
  const glide = "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <>
      <section
        ref={ref}
        className="relative flex min-h-[calc(100vh-72px)] items-center overflow-hidden bg-page"
        aria-labelledby="notfound-heading"
      >
        {/* ===== BACKDROP — a real photograph from the catalog ===== */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ transform: shift(-26), transition: glide }}
        >
          {photo && (
            <img
              src={photo}
              alt=""
              /* Scaled past the frame so the parallax shift never exposes an
                 edge, and dimmed and thrown out of focus: depth of field is
                 what sells the numerals as a nearer plane, and it stops the
                 backdrop's detail from fighting the photo inside them. */
              className="animate-kenburns h-full w-full scale-[1.12] object-cover object-[50%_22%] opacity-[0.22] blur-[3px] grayscale-[0.6]"
            />
          )}
        </div>

        {/* Vignette + top/bottom fades so the stage dissolves into the navbar
            above and the product strip below instead of ending on a hard seam. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(75%_65%_at_50%_45%,transparent_0%,rgba(10,10,10,0.72)_58%,#0a0a0a_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-page to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-page to-transparent"
        />

        {/* The one red note on the page: a slow-breathing accent bloom that
            trails the pointer behind the numerals. */}
        <div
          aria-hidden
          className="animate-glow absolute top-1/2 left-1/2 size-[min(620px,90vw)] rounded-full bg-accent/25 blur-[130px]"
          style={{
            transform: `translate3d(calc(-50% + ${offset.x * 60}px), calc(-50% + ${offset.y * 42}px), 0)`,
            transition: glide,
          }}
        />

        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{ backgroundImage: `url("${GRAIN}")`, backgroundSize: "160px 160px" }}
        />

        {/* ===== CONTENT ===== */}
        <div className="relative z-10 mx-auto w-full max-w-[900px] px-6 py-20 text-center lg:py-24">
          <p
            className="animate-fade-up font-ui text-[11px] tracking-[0.36em] text-accent uppercase"
            style={{ animationDelay: "0.05s" }}
          >
            Error 404
          </p>

          <div className="relative mt-3">
            <div
              className="animate-fade-up bg-clip-text font-display font-semibold text-transparent"
              style={{
                /* The floor carries phones: 29vw alone would set this at ~113px
                   on a 390px screen, which turns the whole point of the page
                   into a caption. */
                fontSize: "clamp(170px, 29vw, 380px)",
                lineHeight: 0.84,
                letterSpacing: "-0.035em",
                /* Photo on top, gradient underneath. If the image never
                   arrives — or 404s itself — the gradient is what fills the
                   glyphs, so the numerals are never invisible. */
                backgroundImage: fill
                  ? /* Mid-grey floor under the photo, composited with
                       `lighten`. A crop that happens to land on a shadow would
                       otherwise fill the glyphs with near-black on a black
                       page; max(photo, grey) guarantees an edge without
                       flattening the bright fabric above it. */
                    `url("${fill}"), linear-gradient(160deg, #6e6e6e 0%, #454545 55%, #7d7d7d 100%)`
                  : "linear-gradient(145deg, #ffffff 0%, #f1f1f1 38%, var(--color-accent-bright) 78%, var(--color-accent) 100%)",
                backgroundBlendMode: fill ? "lighten" : "normal",
                /* Zoomed to roughly the middle half of the frame. `cover` on a
                   box this wide takes a full-width slice of a portrait photo,
                   which drags in whatever was behind the model at both edges;
                   pushing past 100% keeps the glyphs on the garment itself. */
                backgroundSize: "190% auto, cover",
                /* Framed low: these are full-length portraits, and the middle
                   of the frame is where the garment is. Fabric and print read
                   as texture inside a letterform; a cropped face reads as an
                   accident. */
                backgroundPosition: `${50 + offset.x * 7}% ${62 + offset.y * 7}%, center`,
                transform: shift(20),
                transition: `${glide}, background-position 260ms cubic-bezier(0.22, 1, 0.36, 1)`,
                /* Monochrome on purpose. The fill is whatever garment the
                   catalog hands us, and a mustard skirt would put a giant
                   yellow numeral on a site whose only accent is red. Stripped
                   of colour it keeps the fabric, drape and light while red
                   stays the one coloured thing on the page. The gradient
                   fallback is exempt: it is already brand red. */
                filter: `${fill ? "grayscale(1) " : ""}brightness(1.12) contrast(1.14) drop-shadow(0 18px 46px rgba(0,0,0,0.65))`,
                animationDelay: "0.1s",
              }}
              aria-hidden
            >
              404
            </div>

            {/* Signed like a garment tag, overlapping the last numeral. */}
            <p
              className="animate-fade-up absolute right-[3%] bottom-[2%] rotate-[-5deg] font-script text-accent-bright [text-shadow:0_2px_24px_rgba(225,29,42,0.5)]"
              style={{ fontSize: "clamp(38px, 9vw, 76px)", animationDelay: "0.42s" }}
              aria-hidden
            >
              lost?
            </p>
          </div>

          <span
            aria-hidden
            className="animate-fade-up mx-auto mt-9 block h-px w-[140px] bg-gradient-to-r from-transparent via-accent to-transparent"
            style={{ animationDelay: "0.3s" }}
          />

          <h1
            id="notfound-heading"
            className="animate-fade-up mt-8 font-display text-[30px] leading-[1.2] font-medium text-white sm:text-[38px]"
            style={{ animationDelay: "0.36s" }}
          >
            This look isn’t here.
          </h1>
          <p
            className="animate-fade-up mx-auto mt-4 max-w-[520px] text-[15px] leading-[26px] text-body sm:text-[16px]"
            style={{ animationDelay: "0.42s" }}
          >
            The link is broken, or the piece it pointed to has moved on. Let’s get you back to
            something you’ll actually want to wear.
          </p>

          <p
            className="animate-fade-up mx-auto mt-6 flex w-fit max-w-full items-center gap-2 rounded-full border border-line bg-black/40 px-4 py-1.5 font-ui text-[12px] text-muted backdrop-blur-sm"
            style={{ animationDelay: "0.48s" }}
          >
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
            <span className="truncate">You tried {location.pathname}</span>
          </p>

          <div
            className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "0.54s" }}
          >
            <Link
              to="/"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-medium text-black transition-opacity duration-300 hover:opacity-90"
            >
              Back to home
              <ArrowRight className="size-[18px] transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              to="/shop"
              className="inline-flex items-center rounded-full border border-white/40 px-7 py-3.5 text-[15px] font-medium text-white transition-colors duration-300 hover:border-white hover:bg-white/10"
            >
              Browse the shop
            </Link>
          </div>
        </div>
      </section>

      {/* ===== RECOVERY — real stock, not a consolation message ===== */}
      {picks.length > 0 && (
        <section className="border-t border-line/60 py-[72px]" aria-labelledby="notfound-picks">
          <div className="mx-auto w-full max-w-[1338px] px-6 min-[1400px]:px-0">
            <Reveal className="flex items-end justify-between gap-6">
              <div>
                <p className="text-[12px] tracking-[0.08em] text-accent uppercase">New this week</p>
                <h2
                  id="notfound-picks"
                  className="mt-2 font-display text-[28px] leading-[38px] font-medium text-white sm:text-[35px] sm:leading-[47px]"
                >
                  While you’re here
                </h2>
              </div>
              <Link
                to="/shop"
                className="group hidden shrink-0 items-center gap-2 text-[14px] font-medium text-white transition-colors hover:text-accent sm:inline-flex"
              >
                View all
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Reveal>

            <div className="mt-[44px] grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 lg:gap-6">
              {picks.map((p, i) => (
                <Reveal key={p.id} delay={i * 80} className="h-full">
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
