import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format";

/* "Shop the Edit" — a real horizontal product carousel (replaces the earlier
   static parallax grid). Features:
   - smooth scroll-snap track, native touch scroll on mobile
   - prev/next arrows that glide two cards at a time and loop at the ends
   - pointer drag-to-scroll on desktop, with a click-guard so a drag never
     accidentally opens a product
   - gentle auto-advance that pauses on hover/focus/drag
   - product → styled-shot crossfade on hover, cards link to the PDP
   Honours prefers-reduced-motion (no auto-advance, no drag inertia). */

const AUTO_MS = 3800;

export default function ExecutiveImpactCarousel({ products }: { products: Product[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < max - 8);
  }, []);

  const step = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const gap = 24;
    const per = window.innerWidth < 768 ? 1 : 2;
    const amount = card ? (card.offsetWidth + gap) * per : el.clientWidth * 0.8;
    const max = el.scrollWidth - el.clientWidth;

    if (dir > 0 && el.scrollLeft >= max - 8) {
      el.scrollTo({ left: 0, behavior: "smooth" }); // loop back to start
    } else if (dir < 0 && el.scrollLeft <= 8) {
      el.scrollTo({ left: max, behavior: "smooth" }); // loop to end
    } else {
      el.scrollBy({ left: amount * dir, behavior: "smooth" });
    }
  }, []);

  // Track scroll position → arrow enabled states.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, products.length]);

  // Auto-advance, paused on hover / focus / active drag.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = trackRef.current;
    if (!el) return;
    let paused = false;
    const pause = () => (paused = true);
    const resume = () => (paused = false);
    el.addEventListener("pointerenter", pause);
    el.addEventListener("pointerleave", resume);
    el.addEventListener("focusin", pause);
    el.addEventListener("focusout", resume);
    const id = window.setInterval(() => {
      if (!paused && !draggingRef.current) step(1);
    }, AUTO_MS);
    return () => {
      window.clearInterval(id);
      el.removeEventListener("pointerenter", pause);
      el.removeEventListener("pointerleave", resume);
      el.removeEventListener("focusin", pause);
      el.removeEventListener("focusout", resume);
    };
  }, [step]);

  // Pointer drag-to-scroll (desktop). Touch uses native overflow scrolling.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let startX = 0;
    let startLeft = 0;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      draggingRef.current = true;
      movedRef.current = false;
      startX = e.clientX;
      startLeft = el.scrollLeft;
      el.classList.add("cursor-grabbing");
    };
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) movedRef.current = true;
      el.scrollLeft = startLeft - dx;
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      el.classList.remove("cursor-grabbing");
    };
    // Swallow the click that follows a real drag so we don't navigate.
    const onClickCapture = (e: MouseEvent) => {
      if (movedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        movedRef.current = false;
      }
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClickCapture, true);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  if (products.length === 0) return null;

  return (
    <div className="relative">
      {/* edge fades hint at more content on either side */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-10 bg-gradient-to-r from-page to-transparent sm:w-16" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-10 bg-gradient-to-l from-page to-transparent sm:w-16" />

      {/* arrows (desktop) */}
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Previous products"
        className="absolute top-1/2 left-2 z-30 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white/90 text-ink shadow-[0_6px_20px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-all hover:scale-105 hover:border-accent hover:text-accent disabled:opacity-0 md:flex"
        disabled={!canPrev}
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Next products"
        className="absolute top-1/2 right-2 z-30 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white/90 text-ink shadow-[0_6px_20px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-all hover:scale-105 hover:border-accent hover:text-accent disabled:opacity-0 md:flex"
        disabled={!canNext}
      >
        <ChevronRight className="size-5" />
      </button>

      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-6 py-3 md:cursor-grab min-[1400px]:px-[calc((100vw-1338px)/2)]"
        style={{ scrollPaddingLeft: 24, scrollPaddingRight: 24 }}
        role="region"
        aria-label="Shop the edit carousel"
      >
        {products.map((p) => (
          <CarouselCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

function CarouselCard({ product }: { product: Product }) {
  const prod = product.images[0] ?? "";
  const model = product.images[1] ?? prod;

  return (
    <Link
      to={`/shop/${product.slug}`}
      data-card
      aria-label={product.name}
      className="group relative w-[264px] shrink-0 snap-start sm:w-[300px]"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-[10px] border border-line bg-white shadow-[0_6px_24px_rgba(0,0,0,0.06)] transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_18px_44px_rgba(68,2,211,0.14)]">
        <img
          src={prod}
          alt={product.name}
          loading="lazy"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover object-top transition-all duration-700 ease-out group-hover:scale-[1.05] group-hover:opacity-0"
        />
        <img
          src={model}
          alt=""
          loading="lazy"
          draggable={false}
          aria-hidden
          className="absolute inset-0 h-full w-full scale-[1.05] object-cover object-top opacity-0 transition-all duration-700 ease-out group-hover:scale-100 group-hover:opacity-100"
        />

        {/* readability gradient + info */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="font-display text-[19px] leading-tight font-medium text-white drop-shadow-sm">
            {product.name}
          </h3>
          <div className="mt-1 flex items-center gap-2 font-display text-[15px]">
            {product.mrp && (
              <span className="text-white/55 line-through">
                {formatPrice(product.mrp, product.currencyCode)}
              </span>
            )}
            <span className="font-semibold text-white">
              {formatPrice(product.price, product.currencyCode)}
            </span>
          </div>
          <span className="mt-3 inline-flex translate-y-2 items-center gap-1 text-[12px] font-medium tracking-[0.12em] text-white uppercase opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            View Details
            <ChevronRight className="size-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
