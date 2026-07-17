import { useState } from "react";
import { Link } from "react-router-dom";
import type { Product } from "@/types";
import { getBestSellers } from "@/lib/catalog";
import { useAsyncData } from "@/hooks/useAsyncData";
import ProductCard, { ProductCardSkeleton } from "@/components/product/ProductCard";
import Reveal from "@/components/ui/Reveal";
import iconArrow from "@/assets/icon-viewall-arrow.svg";

const chips = ["All", "Kurta Set", "Coord Set"] as const;

/* Figma "Top Picks for You" (2007:3361) — the user's Best Sellers slot.
   Filter chips, hairline rule with accent segment, View All, 4-col grid. */
export default function BestSellers({ onQuickView }: { onQuickView: (p: Product) => void }) {
  const [chip, setChip] = useState<(typeof chips)[number]>("All");
  const { data, loading } = useAsyncData(() => getBestSellers(), []);
  const items = (data ?? []).filter((p) => chip === "All" || p.category === chip);

  return (
    <section className="py-[72px]" aria-labelledby="best-sellers-heading">
      <div className="mx-auto w-full max-w-[1338px] px-6 min-[1400px]:px-0">
        <Reveal className="text-center">
          <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Featured Collection</p>
          <h2
            id="best-sellers-heading"
            className="mt-2 font-display text-[35px] leading-[47px] font-medium text-black"
          >
            Top Picks for You
          </h2>
          <p className="mt-2 text-[16px] leading-[22px] text-body">
            Timeless pieces designed for everyday style.
          </p>
        </Reveal>

        <div className="mt-[44px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[34px]" role="tablist" aria-label="Filter products">
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={chip === c}
                  onClick={() => setChip(c)}
                  className={`cursor-pointer pb-3 text-[16px] leading-[22px] transition-colors ${
                    chip === c ? "font-medium text-accent" : "text-body hover:text-black"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <Link
              to="/shop"
              className="flex items-center gap-1 pb-3 text-[16px] font-medium text-body transition-colors hover:text-accent"
            >
              View All
              <img src={iconArrow} alt="" className="size-6" />
            </Link>
          </div>
          <div className="relative h-px w-full bg-line">
            <span className="absolute top-[-1px] left-[12px] h-[2px] w-[33px] bg-accent" />
          </div>
        </div>

        <div className="mt-[50px] grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-[15px]">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : items.slice(0, 8).map((p, i) => (
                <Reveal key={p.id} variant="up" delay={(i % 4) * 90}>
                  <ProductCard product={p} onQuickView={onQuickView} />
                </Reveal>
              ))}
        </div>
      </div>
    </section>
  );
}
