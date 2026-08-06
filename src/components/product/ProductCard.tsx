import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice, discountPercent } from "@/lib/format";
import { useWishlist } from "@/context/WishlistContext";
import Badge from "@/components/ui/Badge";
import DiscountPill from "@/components/ui/DiscountPill";
import Skeleton from "@/components/ui/Skeleton";

interface Props {
  product: Product;
  onQuickView?: (product: Product) => void;
}

/* Figma card (1:5926 component): 321x492, bg #faf8ff r-11, image 294x348 r-6,
   badge top-left, name + accent-tint heart circle, divider, meta left / price right */
export default function ProductCard({ product, onQuickView }: Props) {
  const { has, toggle } = useWishlist();
  const wished = has(product.id);
  // Shopify compare-at price drives the on-sale display: struck MRP + % off.
  const off = discountPercent(product.price, product.mrp);

  return (
    <div className="group relative flex h-full flex-col rounded-card bg-card p-[9px] pb-[10px] sm:p-[13px] sm:pb-[11px]">
      <div className="relative overflow-hidden rounded-img">
        <Link to={`/shop/${product.slug}`} aria-label={product.name}>
          {/* A Shopify product can exist before its media finishes processing —
              show a plain surface rather than a broken-image icon. */}
          {product.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              loading="lazy"
              className="aspect-[294/348] w-full rounded-img object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="aspect-[294/348] w-full rounded-img bg-surface" />
          )}
        </Link>
        {/* On sale, the corner pill states the discount outright; otherwise it
            keeps the plain "New"/badge treatment. */}
        {off > 0 ? (
          <DiscountPill
            percent={off}
            className="absolute top-[8px] left-[8px] sm:top-[14px] sm:left-[16px]"
          />
        ) : (
          product.badge && (
            <span className="absolute top-[8px] left-[8px] sm:top-[14px] sm:left-[16px]">
              <Badge>{product.badge}</Badge>
            </span>
          )
        )}
        {onQuickView && (
          <button
            type="button"
            onClick={() => onQuickView(product)}
            className="absolute inset-x-3 bottom-3 cursor-pointer rounded-btn bg-black/80 py-2 text-[13px] font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 focus-visible:opacity-100"
          >
            Quick View
          </button>
        )}
      </div>

      {/* Grows so the price row sits on the card's floor — two cards side by
          side on mobile keep their dividers and prices on the same line even
          when one name wraps and the other doesn't. */}
      <div className="mt-[10px] flex-1 sm:mt-[14px]">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/shop/${product.slug}`}
            className="line-clamp-2 text-[14px] leading-[19px] font-medium text-white hover:text-accent sm:text-[18px] sm:leading-[22px]"
          >
            {product.name}
          </Link>
          <button
            type="button"
            onClick={() => toggle(product.id)}
            aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            aria-pressed={wished}
            className={`flex size-[28px] shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors sm:size-[34px] ${
              wished ? "bg-accent text-white" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Heart
              className="size-[15px] sm:size-[18px]"
              strokeWidth={1.8}
              fill={wished ? "currentColor" : "none"}
            />
          </button>
        </div>
        {/* Shopify gives one product type, which lands in both `group` and
            `category` — show the sub-label only when it says something new. */}
        {product.group.trim().toLowerCase() !== product.category.trim().toLowerCase() && (
          <p className="mt-[4px] text-[12px] leading-[18px] text-body sm:mt-[6px] sm:text-[14px] sm:leading-[22px]">
            {product.group}
          </p>
        )}
      </div>

      <div className="mt-[10px] border-t border-line pt-[8px] sm:mt-[12px]">
        <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
          <div className="text-[12px] leading-[18px] text-body sm:text-[14px] sm:leading-[22px]">
            <p>{product.category}</p>
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            {off > 0 && product.mrp && (
              <span className="text-[12px] leading-[18px] text-muted line-through sm:text-[14px] sm:leading-[22px]">
                {formatPrice(product.mrp, product.currencyCode)}
              </span>
            )}
            <p className="text-[15px] leading-[19px] font-medium text-accent sm:text-[18px] sm:leading-[22px]">
              {formatPrice(product.price, product.currencyCode)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Loading placeholder matching the card's proportions. */
export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-card bg-card p-[9px] pb-[10px] sm:p-[13px] sm:pb-[11px]">
      <Skeleton className="aspect-[294/348] w-full rounded-img" />
      <div className="mt-[10px] flex flex-1 items-center justify-between sm:mt-[14px]">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="size-[28px] rounded-full sm:size-[34px]" />
      </div>
      <Skeleton className="mt-[10px] h-4 w-1/4" />
      <div className="mt-[10px] border-t border-line pt-[10px] sm:mt-[12px]">
        <Skeleton className="h-5 w-2/5" />
      </div>
    </div>
  );
}
