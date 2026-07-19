import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format";
import Badge from "@/components/ui/Badge";

/* Staggered infinite product wall — a take on the 21st.dev "staggered carousel".

   Scroll behaviour (desktop): the wall is pinned to the viewport with a plain
   sticky element inside a tall spacer. While it's pinned the page appears to
   hold still and only the columns move, which is the effect the original got
   from GSAP's `pin: true` + scrub — but achieved with CSS sticky, so we never
   preventDefault the wheel. That matters: the columns loop forever, so hijacking
   the wheel would trap the reader with no way to scroll past. Here the pin
   simply releases once the spacer is consumed, and trackpad, keyboard and touch
   all behave normally.

   Column motion: products are dealt round-robin into columns and each column
   repeats its set COPIES times. Two things drive a column — scroll progress
   through the spacer, plus a steady auto-scroll drift so the wall cycles through
   everything on its own without the reader having to move. Both are scaled by
   the column's own speed/direction and wrapped modulo one copy's height, so a
   column never runs out and the seam is invisible (the neighbouring copy is
   pixel-identical). A per-column phase keeps the columns from lining up. The
   drift pauses on hover/focus so cards stay readable and clickable, and the rAF
   loop only runs while the wall is near the viewport.

   Below `lg`, and under prefers-reduced-motion, the pin and the transforms are
   dropped entirely for a plain static grid. */

const NAV_H = 72; // sticky navbar height the pin sits below
const PIN_VH = 300; // spacer height; how long the wall stays pinned
const COPIES = 3;
const TRAVEL = 2400; // px a speed-1.0 column travels across the whole pin
const AUTO_PX_S = 50; // px/second a speed-1.0 column drifts on its own
const SPEEDS = [1, -0.8, 1.3]; // per column; sign flips the direction
const PHASES = [0, 0.5, 0.25]; // starting offset as a fraction of one copy

const canPin = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(min-width: 1024px)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function StaggeredCarousel({
  products,
  heading,
}: {
  products: Product[];
  heading?: ReactNode;
}) {
  const spacerRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [pinned, setPinned] = useState(canPin);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setPinned(wide.matches && !still.matches);
    wide.addEventListener("change", apply);
    still.addEventListener("change", apply);
    return () => {
      wide.removeEventListener("change", apply);
      still.removeEventListener("change", apply);
    };
  }, []);

  useEffect(() => {
    if (!pinned) {
      for (const c of colRefs.current) if (c) c.style.transform = "";
      return;
    }

    const spacer = spacerRef.current;
    if (!spacer) return;

    let raf = 0;
    let last = 0;
    let auto = 0; // px of self-drift accumulated over time
    let paused = false;

    const render = () => {
      const stickyH = window.innerHeight - NAV_H;
      const total = spacer.offsetHeight - stickyH;
      if (total <= 0) return;
      // 0 when the wall locks into place, 1 when the pin lets go.
      const p = Math.min(1, Math.max(0, (NAV_H - spacer.getBoundingClientRect().top) / total));
      for (let i = 0; i < colRefs.current.length; i++) {
        const col = colRefs.current[i];
        const copy = copyRefs.current[i];
        if (!col || !copy) continue;
        const h = copy.offsetHeight;
        if (h <= 0) continue;
        // Scroll-driven travel + the auto-scroll drift, both scaled per column.
        const raw = (p * TRAVEL + auto) * SPEEDS[i] + PHASES[i] * h;
        // Wrap into [0, h) then sit in [-h, 0) so a copy always covers the mask.
        col.style.transform = `translate3d(0, ${(((raw % h) + h) % h) - h}px, 0)`;
      }
    };

    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      if (!paused) auto += AUTO_PX_S * dt;
      render();
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    // Only animate while the wall is anywhere near the viewport.
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), {
      rootMargin: "200px",
    });
    io.observe(spacer);

    // Hold still while the reader is hovering or tabbing through a card.
    const pause = () => (paused = true);
    const resume = () => (paused = false);
    spacer.addEventListener("pointerenter", pause);
    spacer.addEventListener("pointerleave", resume);
    spacer.addEventListener("focusin", pause);
    spacer.addEventListener("focusout", resume);

    render();
    return () => {
      io.disconnect();
      stop();
      spacer.removeEventListener("pointerenter", pause);
      spacer.removeEventListener("pointerleave", resume);
      spacer.removeEventListener("focusin", pause);
      spacer.removeEventListener("focusout", resume);
    };
  }, [pinned, products.length]);

  const cols = pinned ? 3 : 2;
  const columns: Product[][] = Array.from({ length: cols }, () => []);
  products.forEach((p, i) => columns[i % cols].push(p));

  const grid = (
    <div className="grid grid-cols-2 items-start gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6">
      {columns.map((col, i) => (
        <div
          key={i}
          ref={(el) => {
            colRefs.current[i] = el;
          }}
          className="flex flex-col will-change-transform"
        >
          {Array.from({ length: pinned ? COPIES : 1 }).map((_, c) => (
            <div
              key={c}
              ref={(el) => {
                if (c === 0) copyRefs.current[i] = el;
              }}
              className="flex flex-col gap-4 pb-4 sm:gap-5 sm:pb-5 lg:gap-6 lg:pb-6"
            >
              {col.map((p) => (
                <StaggeredCard key={`${c}-${p.id}`} product={p} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1120px] px-6">
      {pinned ? (
        <div ref={spacerRef} className="relative" style={{ height: `${PIN_VH}vh` }}>
          <div
            className="sticky flex flex-col overflow-hidden"
            style={{ top: NAV_H, height: `calc(100vh - ${NAV_H}px)` }}
          >
            {heading && <div className="shrink-0 pt-10 pb-8">{heading}</div>}
            <div className="relative min-h-0 flex-1 overflow-hidden">
              {grid}
              {/* edge fades so cards dissolve instead of hard-clipping */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-page to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-page to-transparent" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {heading && <div className="pb-8">{heading}</div>}
          {grid}
        </>
      )}

      <div className="mt-16 flex justify-center">
        <Link
          to="/shop"
          className="group inline-flex items-center gap-1.5 rounded-btn border border-line-strong px-6 py-3 text-[15px] font-medium text-white transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          View all products
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

function StaggeredCard({ product }: { product: Product }) {
  const prod = product.images[0] ?? "";
  const model = product.images[1] ?? prod;

  return (
    <Link
      to={`/shop/${product.slug}`}
      aria-label={product.name}
      className="group relative block overflow-hidden rounded-[10px] border border-line bg-card shadow-[0_6px_24px_rgba(0,0,0,0.4)] transition-all duration-500 select-none hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_18px_44px_rgba(225,29,42,0.18)]"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
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

        {product.badge && (
          <span className="absolute top-3 left-3 z-10">
            <Badge>{product.badge}</Badge>
          </span>
        )}

        {/* readability gradient + info */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <h3 className="font-display text-[18px] leading-tight font-medium text-white drop-shadow-sm">
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
