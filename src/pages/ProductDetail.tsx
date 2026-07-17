import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Product } from "@/types";
import { getProductByHandle, getBestSellers } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { reviewsFor } from "@/data/reviews";
import ImageGallery from "@/components/product/ImageGallery";
import ProductCard, { ProductCardSkeleton } from "@/components/product/ProductCard";
import { ColorSwatches, SizeChips, QuantityStepper } from "@/components/product/PurchaseControls";
import RatingStars from "@/components/ui/RatingStars";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import iconHeart from "@/assets/icon-heart.svg";

type Tab = "details" | "reviews" | "returns";

export default function ProductDetail() {
  const { slug = "" } = useParams();
  const { data: product, loading } = useAsyncData(() => getProductByHandle(slug), [slug]);

  if (loading) return <PdpSkeleton />;
  if (!product) return <NotFound />;

  return <PdpContent key={product.slug} product={product} />;
}

function PdpContent({ product }: { product: Product }) {
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const [color, setColor] = useState<string | null>(product.colors[0]?.name ?? null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("details");

  const variant =
    color && size
      ? product.variants.find((v) => v.color === color && v.size === size)
      : undefined;
  const canAdd = Boolean(variant?.availableForSale);
  const wished = has(product.id);
  const reviews = reviewsFor(product.id);
  const discount =
    product.mrp && product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  const handleAdd = async () => {
    if (!variant) return;
    setBusy(true);
    try {
      await add({
        variantId: variant.id,
        quantity: qty,
        productSlug: product.slug,
        name: product.name,
        image: product.images[0] ?? "",
        size: variant.size,
        color: variant.color,
        unitPrice: variant.price,
      });
      setAdded(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1338px] px-6 py-8 min-[1400px]:px-0">
      <nav className="text-[13px] text-muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-accent">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link to="/shop" className="hover:text-accent">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span className="text-body">{product.name}</span>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,560px)_1fr] lg:gap-16">
        <ImageGallery images={product.images} alt={product.name} />

        <div>
          <h1 className="font-display text-[32px] leading-[42px] font-medium text-black">
            {product.name}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            {product.rating > 0 ? (
              <>
                <RatingStars rating={product.rating} size={18} />
                <span className="text-[14px] text-body">
                  {product.rating} ({product.reviewCount} reviews)
                </span>
              </>
            ) : (
              <span className="text-[14px] text-muted">No reviews yet</span>
            )}
            <span className="text-[13px] text-faint">SKU: {product.sku}</span>
          </div>

          <div className="mt-4 flex items-end gap-3">
            <span className="text-[30px] leading-none font-medium text-black">
              {formatPrice(product.price, product.currencyCode)}
            </span>
            {product.mrp && (
              <span className="text-[18px] leading-none text-body line-through">
                {formatPrice(product.mrp, product.currencyCode)}
              </span>
            )}
            {discount > 0 && (
              <span className="rounded-full bg-sale/10 px-2 py-1 text-[13px] font-medium text-sale">
                {discount}% off
              </span>
            )}
          </div>

          <p className="mt-5 max-w-[560px] text-[15px] leading-[24px] text-body">
            {product.description}
          </p>

          {product.stockLeft != null && product.stockLeft <= 5 && (
            <p className="mt-4 text-[14px] font-medium text-sale">
              Only {product.stockLeft} left in stock — order soon.
            </p>
          )}

          {product.colors.length > 0 && (
            <div className="mt-6 flex flex-col gap-2">
              <p className="text-[15px] font-medium text-[#3d4e5c]">
                Color{color ? `: ${color}` : ""}
              </p>
              <ColorSwatches
                colors={product.colors}
                value={color ?? ""}
                onChange={(c) => {
                  setColor(c);
                  setAdded(false);
                }}
              />
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <p className="text-[15px] font-medium text-[#3d4e5c]">Size</p>
            <SizeChips
              sizes={product.sizes}
              value={size ?? ""}
              onChange={(s) => {
                setSize(s);
                setAdded(false);
              }}
            />
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <QuantityStepper value={qty} onChange={setQty} />
            <Button className="min-w-[200px] flex-1" disabled={!canAdd || busy} onClick={handleAdd}>
              {busy ? "Adding…" : added ? "Added to cart ✓" : "ADD TO CART"}
            </Button>
            <button
              type="button"
              onClick={() => toggle(product.id)}
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={wished}
              className={`flex size-[50px] shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors ${
                wished ? "border-accent bg-accent" : "border-line bg-lavender hover:border-accent"
              }`}
            >
              <img
                src={iconHeart}
                alt=""
                className={`size-[22px] -rotate-[32deg] ${wished ? "invert" : ""}`}
              />
            </button>
          </div>
          {size && !variant ? (
            <p className="mt-3 text-[13px] text-sale">
              That colour and size combination is unavailable.
            </p>
          ) : !size ? (
            <p className="mt-3 text-[13px] text-muted">Select a size to add to cart.</p>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-16 border-b border-line">
        <div className="flex flex-wrap gap-8" role="tablist" aria-label="Product information">
          {(
            [
              ["details", "Description"],
              ["reviews", `Reviews (${reviews.length})`],
              ["returns", "Exchange & Returns"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`-mb-px cursor-pointer border-b-2 pb-3 text-[16px] transition-colors ${
                tab === id
                  ? "border-accent font-medium text-accent"
                  : "border-transparent text-body hover:text-black"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 max-w-[820px]">
        {tab === "details" && (
          <div>
            <h2 className="text-[18px] font-medium text-black">{product.details.title}</h2>
            {product.details.body.map((p, i) => (
              <p key={i} className="mt-3 text-[15px] leading-[25px] text-body">
                {p}
              </p>
            ))}
          </div>
        )}

        {tab === "reviews" && (
          <div className="flex flex-col gap-6">
            {reviews.length === 0 && (
              <p className="text-[15px] text-body">
                No reviews yet — be the first to share your thoughts.
              </p>
            )}
            {reviews.map((r) => (
              <div key={r.id} className="border-b border-line pb-6 last:border-0">
                <div className="flex items-center gap-3">
                  <RatingStars rating={r.rating} size={16} />
                  <span className="text-[14px] font-medium text-black">{r.title}</span>
                </div>
                <p className="mt-2 text-[15px] leading-[24px] text-body">{r.body}</p>
                <p className="mt-2 text-[13px] text-muted">
                  {r.author}
                  {r.verified && <span className="ml-2 text-accent">✓ Verified buyer</span>}
                  <span className="ml-2 text-faint">{r.date}</span>
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === "returns" && (
          <div className="flex flex-col gap-3 text-[15px] leading-[25px] text-body">
            <p>
              We accept returns and exchanges for eligible products within our return policy period,
              provided the item is unused, unwashed, and in its original condition with all tags
              intact.
            </p>
            <p>
              Orders are usually processed within 3–6 business days, and delivery timelines may vary
              depending on your location. To start a return or exchange, please reach out to our
              support team and we’ll be happy to help.
            </p>
          </div>
        )}
      </div>

      <RelatedProducts currentId={product.id} category={product.category} />
    </div>
  );
}

function RelatedProducts({ currentId, category }: { currentId: string; category: string }) {
  const { data, loading } = useAsyncData(() => getBestSellers(), []);
  const items = (data ?? [])
    .filter((p) => p.id !== currentId)
    .sort((a, b) => Number(b.category === category) - Number(a.category === category))
    .slice(0, 4);

  if (!loading && items.length === 0) return null;

  return (
    <section className="mt-20" aria-labelledby="related-heading">
      <h2 id="related-heading" className="font-display text-[26px] font-medium text-black">
        You may also like
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-[15px]">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

function PdpSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1338px] px-6 py-8 min-[1400px]:px-0">
      <Skeleton className="h-4 w-48" />
      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,560px)_1fr] lg:gap-16">
        <Skeleton className="aspect-[4/5] w-full rounded-img" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="mt-3 h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-[600px] px-6 py-24 text-center">
      <h1 className="font-display text-[28px] font-medium text-black">Product not found</h1>
      <p className="mt-2 text-[15px] text-body">
        The product you’re looking for doesn’t exist or is no longer available.
      </p>
      <Link
        to="/shop"
        className="mt-6 inline-flex items-center justify-center rounded-btn bg-black px-6 py-3 text-[15px] font-medium text-white transition-opacity hover:opacity-85"
      >
        Back to Shop
      </Link>
    </div>
  );
}
