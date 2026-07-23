import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import RatingStars from "@/components/ui/RatingStars";
import { ColorSwatches, SizeChips, QuantityStepper } from "./PurchaseControls";
import { X } from "lucide-react";

interface Props {
  product: Product | null;
  onClose: () => void;
}

/* Figma "Home/Popoup" 1:1030 — quick-view over Top Picks */
export default function QuickViewModal({ product, onClose }: Props) {
  const { add } = useCart();
  const [color, setColor] = useState<string | null>(product?.colors[0]?.name ?? null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);

  const key = product?.id;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setColor(product?.colors[0]?.name ?? null);
    setSize(null);
    setQty(1);
    setAdded(false);
    setBusy(false);
  }

  // Revert the "Added ✓" confirmation after a short pause.
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(t);
  }, [added]);

  const hasColorOpt = (product?.colors.length ?? 0) > 0;
  const hasSizeOpt = (product?.sizes.length ?? 0) > 0;
  /* Same rule as the PDP: a product with no Size option (Shopify gives it a
     single "Default Title" variant) has nothing to select, so resolve straight
     to that variant — otherwise `size` stays null and Add to Cart can never
     enable, leaving an empty Size row and a dead button. */
  const variant = !product
    ? undefined
    : !hasSizeOpt
      ? product.variants[0]
      : size && (color || !hasColorOpt)
        ? product.variants.find((v) => v.size === size && (hasColorOpt ? v.color === color : true))
        : undefined;
  const canAdd = Boolean(variant?.availableForSale);

  const handleAdd = async () => {
    if (!product || !variant) return;
    setBusy(true);
    try {
      // Failures surface as a toast from CartContext; only confirm on success.
      const ok = await add({
        variantId: variant.id,
        quantity: qty,
        productSlug: product.slug,
        name: product.name,
        image: product.images[0] ?? "",
        size: variant.size,
        color: variant.color,
        unitPrice: variant.price,
      });
      if (ok) setAdded(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!product} onClose={onClose} label={product ? `Quick view: ${product.name}` : ""}>
      {product && (
        <div className="grid grid-cols-1 gap-8 p-6 md:grid-cols-[minmax(0,340px)_1fr] md:p-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick view"
            className="absolute top-4 right-4 z-10 flex size-9 cursor-pointer items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>

          <div>
            {/* A Shopify product can exist before its media finishes processing. */}
            {product.images[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="aspect-[294/348] w-full rounded-img object-cover object-top"
              />
            ) : (
              <div className="aspect-[294/348] w-full rounded-img bg-surface" />
            )}
            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {product.images.slice(1, 5).map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="h-[64px] w-[52px] rounded-[4px] object-cover object-top"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5 pr-2 md:pt-2">
            <div>
              <p className="font-display text-[24px] leading-8 font-medium text-white">
                {product.name}
              </p>
              {/* Shopify's Storefront API serves no ratings, so live products sit
                  at 0 — show the row only when there's a real score, matching the
                  PDP rather than rendering five empty stars and "(0)". */}
              {product.rating > 0 && (
                <div className="mt-1 flex items-center gap-2">
                  <RatingStars rating={product.rating} size={18} />
                  <span className="text-[14px] text-body">({product.reviewCount})</span>
                </div>
              )}
            </div>

            <div className="flex items-end gap-3">
              <span className="text-[28px] leading-none font-medium text-white">
                {formatPrice(product.price, product.currencyCode)}
              </span>
              {product.mrp && (
                <span className="text-[18px] leading-none text-body line-through">
                  {formatPrice(product.mrp, product.currencyCode)}
                </span>
              )}
              {product.mrp && (
                <span className="rounded-full bg-sale/15 px-2 py-1 text-[13px] font-medium text-sale">
                  {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% off
                </span>
              )}
            </div>

            <p className="text-[15px] leading-[22px] text-body">{product.description}</p>

            {product.colors.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[16px] font-medium text-white">Color</p>
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

            {hasSizeOpt && (
              <div className="flex flex-col gap-2">
                <p className="text-[16px] font-medium text-white">Size</p>
                <SizeChips
                  sizes={product.sizes}
                  value={size ?? ""}
                  onChange={(s) => {
                    setSize(s);
                    setAdded(false);
                  }}
                />
              </div>
            )}

            <div className="flex items-center gap-5">
              <QuantityStepper value={qty} onChange={setQty} max={Math.min(10, product.stockLeft ?? 10)} />
              <Button className="flex-1" disabled={!canAdd || busy} onClick={handleAdd}>
                {busy ? "Adding…" : added ? "Added to cart ✓" : "ADD TO CART"}
              </Button>
            </div>
            {hasSizeOpt && size && (color || !hasColorOpt) && !variant ? (
              <p className="text-[13px] text-sale">That combination is unavailable.</p>
            ) : hasColorOpt && !color ? (
              <p className="text-[13px] text-muted">Select a colour and size to add to cart.</p>
            ) : hasSizeOpt && !size ? (
              <p className="text-[13px] text-muted">Select a size to add to cart.</p>
            ) : null}
            <Link
              to={`/shop/${product.slug}`}
              onClick={onClose}
              className="text-[14px] font-medium text-accent hover:underline"
            >
              View full details →
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
