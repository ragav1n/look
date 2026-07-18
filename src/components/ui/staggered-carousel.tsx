import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format";
import Badge from "@/components/ui/Badge";

/* Staggered infinite product wall — a lightweight take on the 21st.dev
   "staggered carousel".

   How the infinite columns work:
   - Products are dealt round-robin into columns, and each column repeats its
     set COPIES times so the track is far taller than the visible mask.
   - As the page scrolls past, every column translates by its own speed (and
     sign, so neighbours travel in opposite directions). The offset is wrapped
     modulo one copy's height, so a column never runs out — it loops forever and
     the seam is invisible because the neighbouring copy is pixel-identical.
   - A per-column phase keeps the columns from ever lining up.

   This gives the reference's alternating-column motion WITHOUT pinning the page
   or pulling in GSAP, matching the site's hand-rolled, CSS-first motion. Below
   `lg` it degrades to a plain static grid (one copy, no transforms), and the
   whole effect is skipped under prefers-reduced-motion. */

const COPIES = 3;
/* Per-column scroll speed as a fraction of scroll distance. Sign flips the
   direction so adjacent columns visibly move apart from each other. */
const SPEEDS = [0.45, -0.3, 0.6];
/* Starting offset (fraction of one copy) so columns look staggered at rest. */
const PHASES = [0, 0.5, 0.25];

export default function StaggeredCarousel({ products }: { products: Product[] }) {
  const maskRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [cols, setCols] = useState(3);
  const [looping, setLooping] = useState(false);

  // Three looping columns on desktop; a plain two-column grid below that.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => {
      setCols(mq.matches ? 3 : 2);
      setLooping(mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const reset = () => {
      for (const c of colRefs.current) if (c) c.style.transform = "";
    };

    if (!looping || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reset();
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const mask = maskRef.current;
      if (!mask) return;
      const rect = mask.getBoundingClientRect();
      // Distance scrolled since the wall first entered the viewport.
      const travelled = window.innerHeight - rect.top;
      for (let i = 0; i < cols; i++) {
        const col = colRefs.current[i];
        const copy = copyRefs.current[i];
        if (!col || !copy) continue;
        const h = copy.offsetHeight;
        if (h <= 0) continue;
        const raw = -travelled * SPEEDS[i] + PHASES[i] * h;
        // Wrap into [0, h) then sit in [-h, 0) so a copy always covers the mask.
        const wrapped = ((raw % h) + h) % h;
        col.style.transform = `translate3d(0, ${wrapped - h}px, 0)`;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      reset();
    };
  }, [looping, cols, products.length]);

  // Deal products round-robin into the active number of columns.
  const columns: Product[][] = Array.from({ length: cols }, () => []);
  products.forEach((p, i) => columns[i % cols].push(p));
  const copies = looping ? COPIES : 1;

  return (
    <div className="mx-auto mt-4 w-full max-w-[1120px] px-6">
      <div ref={maskRef} className="relative overflow-hidden lg:h-[720px]">
        <div className="grid grid-cols-2 items-start gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {columns.map((col, i) => (
            <div
              key={i}
              ref={(el) => {
                colRefs.current[i] = el;
              }}
              className="flex flex-col will-change-transform"
            >
              {Array.from({ length: copies }).map((_, c) => (
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

        {/* edge fades so cards dissolve into the page instead of hard-clipping */}
        <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-24 bg-gradient-to-b from-page to-transparent lg:block" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-24 bg-gradient-to-t from-page to-transparent lg:block" />
      </div>

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
      className="group relative block overflow-hidden rounded-[10px] border border-line bg-card shadow-[0_6px_24px_rgba(0,0,0,0.4)] transition-all duration-500 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_18px_44px_rgba(225,29,42,0.18)]"
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
