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
    <div className="group relative flex flex-col rounded-card bg-card p-[13px] pb-[11px]">
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
          <DiscountPill percent={off} className="absolute top-[14px] left-[16px]" />
        ) : (
          product.badge && (
            <span className="absolute top-[14px] left-[16px]">
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

      <div className="mt-[14px] flex items-center justify-between">
        <Link
          to={`/shop/${product.slug}`}
          className="text-[18px] leading-[22px] font-medium text-white hover:text-accent"
        >
          {product.name}
        </Link>
        <button
          type="button"
          onClick={() => toggle(product.id)}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={wished}
          className={`flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${
            wished ? "bg-accent text-white" : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          <Heart className="size-[18px]" strokeWidth={1.8} fill={wished ? "currentColor" : "none"} />
        </button>
      </div>
      {/* Shopify gives one product type, which lands in both `group` and
          `category` — show the sub-label only when it says something new. */}
      {product.group.trim().toLowerCase() !== product.category.trim().toLowerCase() && (
        <p className="mt-[6px] text-[14px] leading-[22px] text-body">{product.group}</p>
      )}

      <div className="mt-[12px] border-t border-line pt-[8px]">
        <div className="flex items-end justify-between">
          <div className="text-[14px] leading-[22px] text-body">
            <p>{product.category}</p>
          </div>
          <div className="flex items-baseline gap-2">
            {off > 0 && product.mrp && (
              <span className="text-[14px] leading-[22px] text-muted line-through">
                {formatPrice(product.mrp, product.currencyCode)}
              </span>
            )}
            <p className="text-[18px] leading-[22px] font-medium text-accent">
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
    <div className="flex flex-col rounded-card bg-card p-[13px] pb-[11px]">
      <Skeleton className="aspect-[294/348] w-full rounded-img" />
      <div className="mt-[14px] flex items-center justify-between">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="size-[34px] rounded-full" />
      </div>
      <Skeleton className="mt-[10px] h-4 w-1/4" />
      <div className="mt-[12px] border-t border-line pt-[10px]">
        <Skeleton className="h-5 w-2/5" />
      </div>
    </div>
  );
}
