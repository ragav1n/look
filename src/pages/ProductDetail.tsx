import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Heart, RefreshCw, ShieldCheck, Ruler, X } from "lucide-react";
import type { Product } from "@/types";
import { getProductByHandle, getBestSellers } from "@/lib/catalog";
import { formatPrice, discountPercent } from "@/lib/format";
import { cartLimitNotice, lowStockLeft, lowStockNotice, roomToAdd } from "@/lib/stock";
import { useAsyncData } from "@/hooks/useAsyncData";
import LoadError from "@/components/ui/LoadError";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { reviewsFor } from "@/data/reviews";
import ImageGallery from "@/components/product/ImageGallery";
import ProductCard, { ProductCardSkeleton } from "@/components/product/ProductCard";
import ProductTabs from "@/components/product/ProductTabs";
import { ColorSwatches, SizeChips, QuantityStepper } from "@/components/product/PurchaseControls";
import RatingStars from "@/components/ui/RatingStars";
import DiscountPill from "@/components/ui/DiscountPill";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import NotFound from "@/pages/NotFound";
import sizeChart from "@/assets/size-chart.jpg";

/* Brand size-chart artwork (from size_chart.pdf). The "Size Chart" button on
   the PDP opens this in a modal. */
const SIZE_CHART_SRC: string | null = sizeChart;

/* "Trusted by 10K+ Customers" was removed (2026-08-12, client's call): the shop
   opened this month and the number wasn't ours to make. Both remaining claims
   are ones the store can actually keep. */
const trustItems = [
  { icon: RefreshCw, label: "Easy Replacement" },
  { icon: ShieldCheck, label: "Secure Payment" },
];

export default function ProductDetail() {
  const { slug = "" } = useParams();
  const { data: product, loading, error, reload } = useAsyncData(
    () => getProductByHandle(slug),
    [slug],
  );

  if (loading) return <PdpSkeleton />;
  /* A fetch failure is not the same as "this product doesn't exist" — telling
     someone their bookmarked product is gone when the store is merely
     unreachable is a lie they can't recover from. */
  if (error)
    return (
      <LoadError
        title="We couldn't load this product"
        message="Something went wrong reaching the store. The product is probably still there."
        onRetry={reload}
      />
    );
  /* A retired or mistyped product handle is the most common way anyone
     actually reaches a 404 here, so it gets the real page — same treatment,
     and it offers new arrivals instead of a dead end. */
  if (!product) return <NotFound />;

  return <PdpContent key={product.slug} product={product} />;
}

function PdpContent({ product }: { product: Product }) {
  const { add, cart } = useCart();
  const { has, toggle } = useWishlist();
  const navigate = useNavigate();
  const [color, setColor] = useState<string | null>(product.colors[0]?.name ?? null);
  const [size, setSize] = useState<string | null>(null);
  const [qtyChoice, setQtyChoice] = useState(1);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);

  // Revert the "Added ✓" confirmation after a short pause.
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(t);
  }, [added]);

  const hasColorOpt = product.colors.length > 0;
  const hasSizeOpt = product.sizes.length > 0;
  /* A product with no Size option (Shopify gives it a single "Default Title"
     variant) has nothing to select, so resolve straight to that variant —
     otherwise `size` stays null and Add to Cart can never enable. */
  const variant = !hasSizeOpt
    ? product.variants[0]
    : size && (color || !hasColorOpt)
      ? product.variants.find((v) => v.size === size && (hasColorOpt ? v.color === color : true))
      : undefined;
  const canAdd = Boolean(variant?.availableForSale);
  /* The ceiling counts what's already in the cart, so the stepper offers only
     the room that's actually left rather than inviting an add the cart will
     refuse. At zero there's nothing to offer and the buttons go quiet. */
  const inCart = variant ? (cart.lines.find((l) => l.variantId === variant.id)?.quantity ?? 0) : 0;
  const room = roomToAdd(variant?.quantityAvailable, inCart);
  const atCartLimit = canAdd && room === 0;
  const maxQty = Math.max(1, room);
  /* Stock is reported per variant, so this only has an answer once a size (and
     colour, where there is one) narrows the product down to a single one.
     Suppressed at the limit, where the cart's own line says it better. */
  const stockLeft = canAdd && !atCartLimit ? lowStockLeft(variant?.quantityAvailable) : undefined;
  /* A size with 2 left must not inherit the quantity chosen under a size that
     had 40, so the chosen figure is clamped on the way out rather than stored
     pre-clamped. Switching back to a roomier size restores what they picked. */
  const qty = Math.min(qtyChoice, maxQty);
  const wished = has(product.id);
  const reviews = reviewsFor(product.id);

  /* Price follows the chosen size once one is picked; until then we show the
     product's lowest variant price (Shopify's minVariantPrice) as a "from"
     figure. mrp/discount track the same variant so a per-size markdown stays
     internally consistent. */
  const unitPrice = variant?.price.amount ?? product.price;
  const variantMrp =
    variant?.compareAtPrice && variant.compareAtPrice.amount > variant.price.amount
      ? variant.compareAtPrice.amount
      : undefined;
  const mrp = variant ? variantMrp : product.mrp;
  const discount = discountPercent(unitPrice, mrp);

  /* Resolves false when the add failed — CartContext has already raised a
     toast, so the only job here is to not show success UI on top of it. */
  const addToCart = async () => {
    if (!variant) return false;
    return add({
      variantId: variant.id,
      quantity: qty,
      productSlug: product.slug,
      name: product.name,
      image: product.images[0] ?? "",
      size: variant.size,
      color: variant.color,
      unitPrice: variant.price,
      quantityAvailable: variant.quantityAvailable,
    });
  };

  const handleAdd = async () => {
    if (!variant) return;
    setBusy(true);
    try {
      if (await addToCart()) setAdded(true);
    } finally {
      setBusy(false);
    }
  };

  const handleBuyNow = async () => {
    if (!variant) return;
    setBusy(true);
    try {
      // Don't send them to a cart that doesn't have the item in it.
      if (await addToCart()) navigate("/cart");
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
          <h1 className="font-display text-[32px] leading-[42px] font-medium text-white">
            {product.name}
          </h1>
          <div className="mt-3">
            {product.rating > 0 ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5">
                <RatingStars rating={product.rating} size={15} />
                <span className="text-[13px] font-semibold text-white">{product.rating}</span>
                <span className="text-[13px] text-muted">· {product.reviewCount} reviews</span>
              </div>
            ) : (
              <span className="text-[14px] text-muted">No reviews yet</span>
            )}
          </div>

          <div className="mt-4 flex items-end gap-3">
            <span className="text-[30px] leading-none font-medium text-white">
              {formatPrice(unitPrice, product.currencyCode)}
            </span>
            {discount > 0 && mrp && (
              <span className="text-[18px] leading-none text-muted line-through">
                {formatPrice(mrp, product.currencyCode)}
              </span>
            )}
            <DiscountPill percent={discount} variant="inline" />
          </div>

          {product.colors.length > 0 && (
            <div className="mt-6 flex flex-col gap-2">
              <p className="text-[15px] font-medium text-white">Color{color ? `: ${color}` : ""}</p>
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
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-medium text-white">Size</p>
              <button
                type="button"
                onClick={() => setSizeChartOpen(true)}
                className="inline-flex items-center gap-1.5 text-[14px] font-medium text-accent transition-colors hover:text-accent-bright"
              >
                <Ruler className="size-4" />
                Size Chart
              </button>
            </div>
            <SizeChips
              sizes={product.sizes}
              value={size ?? ""}
              onChange={(s) => {
                setSize(s);
                setAdded(false);
              }}
            />
          </div>

          {/* Sits under the size row because it describes the selected size, not
              the product — the same gown can be plentiful in M and nearly gone
              in 4XL. The live region stays mounted rather than being conditionally
              rendered: a screen reader only announces changes inside a region that
              already existed. With nothing to say it goes sr-only, which is
              absolutely positioned and so costs no layout. */}
          <p
            aria-live="polite"
            className={stockLeft != null ? "mt-3 text-[13px] font-medium text-sale" : "sr-only"}
          >
            {stockLeft != null ? lowStockNotice(stockLeft) : ""}
          </p>

          {/* Add to cart + wishlist */}
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <QuantityStepper value={qty} onChange={setQtyChoice} max={maxQty} disabled={atCartLimit} />
            <Button
              className="min-w-[200px] flex-1"
              disabled={!canAdd || busy || atCartLimit}
              onClick={handleAdd}
            >
              {busy ? "Adding…" : added ? "Added to cart ✓" : "ADD TO CART"}
            </Button>
            <button
              type="button"
              onClick={() => toggle(product.id)}
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={wished}
              className={`flex size-[50px] shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors ${
                wished ? "border-accent bg-accent text-white" : "border-line-strong text-white hover:border-accent"
              }`}
            >
              <Heart className="size-[22px]" strokeWidth={1.8} fill={wished ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Buy Now */}
          <Button
            variant="accent"
            className="mt-3 w-full"
            disabled={!canAdd || busy || atCartLimit}
            onClick={handleBuyNow}
          >
            BUY NOW
          </Button>

          {size && !variant ? (
            <p className="mt-3 text-[13px] text-sale">
              That colour and size combination is unavailable.
            </p>
          ) : hasSizeOpt && !size ? (
            <p className="mt-3 text-[13px] text-muted">Select a size to add to cart.</p>
          ) : !canAdd ? (
            <p className="mt-3 text-[13px] text-muted">This piece is currently out of stock.</p>
          ) : atCartLimit ? (
            <p className="mt-3 text-[13px] text-sale">
              {cartLimitNotice(variant?.quantityAvailable, 0)}
            </p>
          ) : null}

          {/* Trust info. Two columns, not three with a hole in it. */}
          <div className="mt-7 grid grid-cols-2 gap-3 border-t border-line pt-6">
            {trustItems.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 text-center">
                <span className="grid size-11 place-items-center rounded-full border border-line-strong text-accent">
                  <Icon className="size-5" strokeWidth={1.6} />
                </span>
                <p className="text-[12px] leading-[16px] font-medium text-body">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Description / Reviews / Exchange & Returns — tabbed to keep the page short */}
      <ProductTabs product={product} reviews={reviews} />

      <RelatedProducts currentId={product.id} category={product.category} />

      {/* Size chart modal — shows the artwork once it's supplied */}
      <Modal
        open={sizeChartOpen}
        onClose={() => setSizeChartOpen(false)}
        label="Size chart"
        maxWidth="max-w-[640px]"
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[22px] font-medium text-white">Size Chart</h2>
            <button
              type="button"
              onClick={() => setSizeChartOpen(false)}
              aria-label="Close size chart"
              className="flex size-9 cursor-pointer items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
          {SIZE_CHART_SRC ? (
            <img
              src={SIZE_CHART_SRC}
              alt="LOOK size chart — measurements in inches"
              className="mt-4 w-full rounded-img bg-white"
            />
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-img border border-dashed border-line-strong py-16 text-center">
              <Ruler className="size-8 text-accent" strokeWidth={1.4} />
              <p className="text-[15px] text-body">
                Our detailed size chart is coming soon.
                <br />
                Sizes available: {product.sizes.join(", ")}.
              </p>
            </div>
          )}
        </div>
      </Modal>
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
      <Reveal>
        <h2 id="related-heading" className="font-display text-[26px] font-medium text-white">
          You may also like
        </h2>
      </Reveal>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-[15px]">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : items.map((p, i) => (
              <Reveal key={p.id} variant="up" delay={i * 90}>
                <ProductCard product={p} />
              </Reveal>
            ))}
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

