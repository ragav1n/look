import { useState } from "react";
import { Link } from "react-router-dom";
import type { Product } from "@/types";
import { getAllProducts } from "@/lib/catalog";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useWishlist } from "@/context/WishlistContext";
import ProductCard, { ProductCardSkeleton } from "@/components/product/ProductCard";
import QuickViewModal from "@/components/product/QuickViewModal";

export default function Wishlist() {
  const { ids } = useWishlist();
  const { data, loading } = useAsyncData(() => getAllProducts(), []);
  const [quickView, setQuickView] = useState<Product | null>(null);

  const items = (data ?? []).filter((p) => ids.includes(p.id));

  return (
    <div>
      <h1 className="font-display text-[26px] font-medium text-white">My Wishlist</h1>
      <p className="mt-1 text-[15px] text-body">Pieces you’ve saved for later.</p>

      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-[15px]">
          {Array.from({ length: 3 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-card bg-card p-10 text-center">
          <p className="text-[16px] font-medium text-white">Your wishlist is empty</p>
          <p className="mt-1 text-[14px] text-body">
            Tap the heart on any product to save it here.
          </p>
          <Link
            to="/shop"
            className="mt-4 inline-block text-[14px] font-medium text-accent hover:underline"
          >
            Browse the collection →
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-[15px]">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} onQuickView={setQuickView} />
          ))}
        </div>
      )}

      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </div>
  );
}
