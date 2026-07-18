import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format";

/* "Shop the Edit" — a truly infinite horizontal product carousel.

   How the infinite loop works (a seamless "treadmill"):
   - We render THREE identical copies of the product list and keep the scroll
     position parked in the middle copy. Whenever scrolling drifts past half a
     copy in either direction we silently jump back by exactly one copy width
     (instant, no animation). Because the neighbouring copy is pixel-identical,
     the jump is invisible — so arrows / drag / auto-advance can run forever
     without ever hitting an edge.
   - Smooth moves (arrows, dots, auto-advance) use scrollBy/scrollTo; the
     recenter jump sets scrollLeft directly (instant).

   Also: pointer drag-to-scroll on desktop with a click-guard, gentle
   auto-advance that pauses on hover/focus/drag, and a product → styled-shot
   crossfade on hover. Honours prefers-reduced-motion. */

const AUTO_MS = 3800;
const COPIES = 3;

export default function ExecutiveImpactCarousel({ products }: { products: Product[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  // Loop only makes sense with enough cards to fill the copies convincingly.
  const loop = products.length >= 3;
  const [active, setActive] = useState(0);
  const [pages, setPages] = useState(1);
  // Non-loop fallback still disables arrows at the extremes.
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const readyRef = useRef(false);

  const items = loop
    ? Array.from({ length: COPIES }).flatMap((_, c) =>
        products.map((p) => ({ p, key: `${c}-${p.id}` })),
      )
    : products.map((p) => ({ p, key: p.id }));

  // Exact width of one product copy, measured from card offsets so it is
  // immune to the track's start/end padding.
  const copyWidth = (el: HTMLElement) => {
    const cards = el.querySelectorAll<HTMLElement>("[data-card]");
    if (!loop || cards.length <= products.length) return el.scrollWidth;
    return cards[products.length].offsetLeft - cards[0].offsetLeft;
  };

  const stepAmount = (el: HTMLElement) => {
    const card = el.querySelector<HTMLElement>("[data-card]");
    const per = window.innerWidth < 768 ? 1 : 2;
    return card ? (card.offsetWidth + 24) * per : el.clientWidth * 0.8;
  };

  // Jump back into the middle copy if we've drifted past its bounds. Instant.
  const recenter = useCallback(() => {
    const el = trackRef.current;
    if (!el || !loop) return;
    const w = copyWidth(el);
    if (w <= 0) return;
    let x = el.scrollLeft;
    while (x < w * 0.5) x += w;
    while (x >= w * 1.5) x -= w;
    if (Math.abs(x - el.scrollLeft) > 0.5) el.scrollLeft = x;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop, products.length]);

  const updateState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const amt = stepAmount(el);
    if (loop) {
      const w = copyWidth(el);
      const withinCopy = w > 0 ? ((el.scrollLeft % w) + w) % w : 0;
      const count = amt > 0 && w > 0 ? Math.max(1, Math.round(w / amt)) : 1;
      setPages(count);
      setActive(amt > 0 ? Math.round(withinCopy / amt) % count : 0);
    } else {
      const max = el.scrollWidth - el.clientWidth;
      setCanPrev(el.scrollLeft > 8);
      setCanNext(el.scrollLeft < max - 8);
      const count = amt > 0 ? Math.max(1, Math.round(max / amt) + 1) : 1;
      setPages(count);
      setActive(Math.min(count - 1, Math.round(el.scrollLeft / amt)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop, products.length]);

  const step = useCallback(
    (dir: 1 | -1) => {
      const el = trackRef.current;
      if (!el) return;
      const amount = stepAmount(el);
      if (loop) {
        recenter(); // stay parked in the middle copy before every move
        el.scrollBy({ left: amount * dir, behavior: "smooth" });
        return;
      }
      const max = el.scrollWidth - el.clientWidth;
      if (dir > 0 && el.scrollLeft >= max - 8) el.scrollTo({ left: 0, behavior: "smooth" });
      else if (dir < 0 && el.scrollLeft <= 8) el.scrollTo({ left: max, behavior: "smooth" });
      else el.scrollBy({ left: amount * dir, behavior: "smooth" });
    },
    [loop, recenter],
  );

  const goToPage = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const amt = stepAmount(el);
    if (loop) {
      const w = copyWidth(el);
      // Pick the copy whose page `i` sits closest to where we are now, so a dot
      // tap only ever glides a short distance (never a whole copy backwards).
      const base = Math.round((el.scrollLeft - i * amt) / w) * w;
      el.scrollTo({ left: base + i * amt, behavior: "smooth" });
    } else {
      const max = el.scrollWidth - el.clientWidth;
      el.scrollTo({ left: Math.min(i * amt, max), behavior: "smooth" });
    }
  };

  // Park the scroll in the middle copy on mount / when the set changes.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el || !loop) {
      readyRef.current = true;
      return;
    }
    readyRef.current = false;
    const id = requestAnimationFrame(() => {
      el.scrollLeft = copyWidth(el); // start of the middle copy
      readyRef.current = true;
      updateState();
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop, products.length]);

  // Keep the loop centred and the dots in sync as the track scrolls.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateState();
    const onScroll = () => {
      if (readyRef.current) recenter();
      updateState();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateState);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateState);
    };
  }, [updateState, recenter]);

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
    <div>
      <div className="relative">
        {/* edge fades hint at more content on either side */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-10 bg-gradient-to-r from-page to-transparent sm:w-16" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-10 bg-gradient-to-l from-page to-transparent sm:w-16" />

        {/* arrows (desktop) — never disabled when the loop is active */}
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous products"
          className="absolute top-1/2 left-2 z-30 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white/90 text-ink shadow-[0_6px_20px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-all hover:scale-105 hover:border-accent hover:text-accent disabled:opacity-0 md:flex"
          disabled={!loop && !canPrev}
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next products"
          className="absolute top-1/2 right-2 z-30 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white/90 text-ink shadow-[0_6px_20px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-all hover:scale-105 hover:border-accent hover:text-accent disabled:opacity-0 md:flex"
          disabled={!loop && !canNext}
        >
          <ChevronRight className="size-5" />
        </button>

        <div
          ref={trackRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 py-3 md:cursor-grab min-[1400px]:px-[calc((100vw-1338px)/2)]"
          style={{ scrollPaddingLeft: 24, scrollPaddingRight: 24 }}
          role="region"
          aria-label="Shop the edit carousel"
        >
          {items.map(({ p, key }) => (
            <CarouselCard key={key} product={p} />
          ))}
        </div>
      </div>

      {/* pagination dots — track position within one copy */}
      {pages > 1 && (
        <div className="mt-7 flex items-center justify-center gap-2.5" role="tablist" aria-label="Carousel pages">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Go to page ${i + 1}`}
              onClick={() => goToPage(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === active ? "w-7 bg-accent" : "w-2 bg-line hover:bg-accent/40"
              }`}
            />
          ))}
        </div>
      )}
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
