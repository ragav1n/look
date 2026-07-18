import { Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { formatMoney } from "@/lib/format";
import { QuantityStepper } from "@/components/product/PurchaseControls";
import Skeleton from "@/components/ui/Skeleton";
import iconCart from "@/assets/icon-cart.svg";

export default function Cart() {
  const { cart, ready, updateQty, remove, clear } = useCart();

  if (!ready) return <CartSkeleton />;
  if (cart.lines.length === 0) return <EmptyCart />;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
      <h1 className="font-display text-[32px] leading-[42px] font-medium text-white">Your Cart</h1>
      <p className="mt-1 text-[15px] text-body">
        {cart.totalQuantity} {cart.totalQuantity === 1 ? "item" : "items"}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        {/* Lines */}
        <div>
          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {cart.lines.map((line) => (
              <li key={line.id} className="flex gap-4 py-5">
                <Link
                  to={`/shop/${line.productSlug}`}
                  className="h-[120px] w-[96px] shrink-0 overflow-hidden rounded-img bg-card"
                >
                  {line.image && (
                    <img
                      src={line.image}
                      alt={line.name}
                      className="h-full w-full object-cover object-top"
                    />
                  )}
                </Link>

                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link
                        to={`/shop/${line.productSlug}`}
                        className="text-[16px] font-medium text-white hover:text-accent"
                      >
                        {line.name}
                      </Link>
                      <p className="mt-1 text-[13px] text-muted">
                        {[line.color, line.size].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <p className="text-[16px] font-medium text-white">{formatMoney(line.lineTotal)}</p>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4">
                    <QuantityStepper
                      value={line.quantity}
                      onChange={(q) => updateQty(line.id, q)}
                    />
                    <button
                      type="button"
                      onClick={() => remove(line.id)}
                      className="cursor-pointer text-[13px] text-muted underline-offset-2 hover:text-sale hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex items-center justify-between">
            <Link to="/shop" className="text-[14px] font-medium text-accent hover:underline">
              ← Continue shopping
            </Link>
            <button
              type="button"
              onClick={() => clear()}
              className="cursor-pointer text-[13px] text-muted hover:text-sale"
            >
              Clear cart
            </button>
          </div>
        </div>

        {/* Summary */}
        <aside className="h-fit rounded-card bg-card p-6">
          <h2 className="text-[18px] font-medium text-white">Order Summary</h2>
          <dl className="mt-4 flex flex-col gap-3 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-body">Subtotal</dt>
              <dd className="font-medium text-white">{formatMoney(cart.cost.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-body">Shipping &amp; taxes</dt>
              <dd className="text-muted">Calculated at checkout</dd>
            </div>
          </dl>
          <div className="mt-4 flex justify-between border-t border-line pt-4">
            <span className="text-[16px] font-medium text-white">Total</span>
            <span className="text-[18px] font-medium text-white">
              {formatMoney(cart.cost.total)}
            </span>
          </div>

          {cart.checkoutUrl ? (
            <a
              href={cart.checkoutUrl}
              className="mt-6 flex h-[52px] w-full items-center justify-center rounded-btn bg-white text-[16px] font-medium text-black transition-opacity hover:opacity-85"
            >
              Proceed to Checkout
            </a>
          ) : (
            <>
              <button
                type="button"
                disabled
                className="mt-6 flex h-[52px] w-full cursor-not-allowed items-center justify-center rounded-btn bg-black/40 text-[16px] font-medium text-white"
              >
                Proceed to Checkout
              </button>
              <p className="mt-3 text-center text-[12px] text-muted">
                Connect Shopify to enable secure checkout. Checkout is hosted by Shopify.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="mx-auto max-w-[560px] px-6 py-24 text-center">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-card">
        <img src={iconCart} alt="" className="size-7 opacity-60" />
      </span>
      <h1 className="mt-5 font-display text-[26px] font-medium text-white">Your cart is empty</h1>
      <p className="mt-2 text-[15px] text-body">
        Looks like you haven’t added anything yet. Explore our latest collection.
      </p>
      <Link
        to="/shop"
        className="mt-6 inline-flex items-center justify-center rounded-btn bg-white px-6 py-3 text-[15px] font-medium text-black transition-opacity hover:opacity-85"
      >
        Start Shopping
      </Link>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
      <Skeleton className="h-9 w-48" />
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[130px] w-full" />
          ))}
        </div>
        <Skeleton className="h-[260px] w-full rounded-card" />
      </div>
    </div>
  );
}
