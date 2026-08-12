import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { usePromo } from "@/hooks/usePromo";
import { formatMoney } from "@/lib/format";
import { lowStockLeft, lowStockNotice, maxOrderableQty } from "@/lib/stock";
import { QuantityStepper } from "@/components/product/PurchaseControls";
import Skeleton from "@/components/ui/Skeleton";
import iconCart from "@/assets/icon-cart.svg";

export default function Cart() {
  const { cart, ready, busyLines, updateQty, remove, clear } = useCart();

  if (!ready) return <CartSkeleton />;
  if (cart.lines.length === 0) return <EmptyCart />;

  const appliedCode = cart.discount?.codes.find((c) => c.applicable);

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
            {cart.lines.map((line) => {
              const left = lowStockLeft(line.quantityAvailable);
              return (
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
                    {/* Capped at what Shopify says is left for this variant, so
                        the cart can't quietly climb past the stock the product
                        page just promised. A line that already exceeds it (stock
                        fell after it was added) simply can't go up, and the note
                        below says why the "+" has gone dead. */}
                    <div className="flex flex-col gap-1.5">
                      <QuantityStepper
                        value={line.quantity}
                        onChange={(q) => updateQty(line.id, q)}
                        max={maxOrderableQty(line.quantityAvailable)}
                      />
                      {left != null && (
                        <p className="text-[12px] font-medium text-sale">{lowStockNotice(left)}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={busyLines.includes(line.id)}
                      onClick={() => remove(line.id)}
                      className="cursor-pointer text-[13px] text-muted underline-offset-2 hover:text-sale hover:underline disabled:cursor-default disabled:opacity-50"
                    >
                      {busyLines.includes(line.id) ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </div>
              </li>
              );
            })}
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
              {/* Before Shopify's line-level allocations, so this column still
                  adds up when the code is a product-scoped one. Identical to
                  cost.subtotal for an order-level code, which is what LOOK's
                  are today. */}
              <dd className="font-medium text-white">
                {formatMoney(cart.cost.subtotalBeforeDiscount)}
              </dd>
            </div>
            {appliedCode && cart.discount!.savings.amount > 0 && (
              <div className="flex justify-between">
                <dt className="text-body">
                  Discount{" "}
                  <span className="font-ui text-[13px] tracking-[0.06em] text-muted">
                    ({appliedCode.code})
                  </span>
                </dt>
                {/* Shopify's own discountedAmount, summed — never a percentage
                    worked out here. The app states no discount percentage
                    anywhere; the rupees are the store's to compute. */}
                <dd className="font-medium text-sale">
                  − {formatMoney(cart.discount!.savings)}
                </dd>
              </div>
            )}
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

          <DiscountBox />

          {cart.checkoutUrl ? (
            <a
              /* The code rides along on its own: it lives on the Shopify cart
                 server-side, and this URL is that same cart's checkout, so
                 hosted checkout opens with it already applied and itemised.
                 There is nothing to append here — don't add ?discount=. */
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

/* Codes, above Proceed to Checkout — the one place on the site where a code is
   actually needed, and until now the one place that never mentioned them.
   Applying here rather than at Shopify's hosted checkout means the shopper sees
   what it takes off before they commit to the handoff. */
function DiscountBox() {
  const { cart, applyDiscount, removeDiscount } = useCart();
  const promo = usePromo();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [announced, setAnnounced] = useState("");

  const applied = cart.discount?.codes.find((c) => c.applicable);
  /* A code Shopify has stopped honouring. applyDiscount strips its own
     rejects, so the only way one gets here is the cart changing underneath it —
     an item removed, taking the bag below the discount's minimum. */
  const stale = cart.discount?.codes.find((c) => !c.applicable);

  const submit = async (code: string) => {
    setBusy(true);
    setError(null);
    const outcome = await applyDiscount(code);
    setBusy(false);
    if (outcome === "applied") {
      setInput("");
      setAnnounced(`Code ${code.trim().toUpperCase()} applied`);
      return;
    }
    /* "failed" already toasted — it's a system problem, and repeating it inline
       would say the same thing twice. Only the shopper's own input gets an
       inline message. */
    if (outcome === "invalid") {
      // Shopify won't say whether the code is unknown, expired, or simply not
      // earned by this bag, so the wording can't claim to know either. The
      // field keeps its value: most of these are typos.
      setError("That code isn't valid for this bag.");
    }
  };

  if (applied) {
    return (
      <div className="mt-5 flex items-center justify-between gap-3 rounded-btn border border-dashed border-white/25 bg-black/30 px-4 py-3">
        <span className="font-ui text-[14px] font-medium tracking-[0.06em] text-white">
          {applied.code}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => void removeDiscount()}
          className="cursor-pointer text-[13px] text-muted underline-offset-2 hover:text-sale hover:underline disabled:cursor-default disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5">
      {stale && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-btn border border-line-strong bg-black/30 px-4 py-3">
          <p className="text-[13px] text-muted">
            <span className="font-ui font-medium text-white">{stale.code}</span> no longer applies
            to this bag.
          </p>
          <button
            type="button"
            onClick={() => void removeDiscount()}
            className="shrink-0 cursor-pointer text-[13px] text-muted underline-offset-2 hover:text-sale hover:underline"
          >
            Remove
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(input);
        }}
      >
        <label htmlFor="promo-code" className="text-[13px] text-body">
          Have a code?
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="promo-code"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "promo-code-error" : undefined}
            /* min-w-0 or the input refuses to shrink below its content width
               and pushes Apply off the panel at 360px. */
            className="h-[46px] min-w-0 flex-1 rounded-btn border border-white/15 bg-black px-4 text-[15px] text-white outline-none placeholder:text-muted focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="h-[46px] shrink-0 cursor-pointer rounded-btn border border-line-strong px-5 text-[14px] font-medium text-white transition-colors hover:border-accent disabled:cursor-default disabled:opacity-50"
          >
            {busy ? "Applying…" : "Apply"}
          </button>
        </div>
        {error && (
          <p id="promo-code-error" className="mt-2 text-[13px] text-sale">
            {error}
          </p>
        )}
      </form>

      {/* The running promo, one tap. Only for a promo the store has cleared for
          the cart — a discount existing in Shopify is not a reason to advertise
          it here. */}
      {promo?.surfaces.cart && !stale && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit(promo.code)}
          className="mt-3 w-full cursor-pointer rounded-btn border border-dashed border-accent/60 px-4 py-2.5 text-[13px] text-body transition-colors hover:border-accent hover:text-white disabled:cursor-default disabled:opacity-50"
        >
          Apply <span className="font-ui font-medium text-white">{promo.code}</span>
        </button>
      )}

      {/* Empty at rest, so it announces the success and nothing else. */}
      <span role="status" className="sr-only">
        {announced}
      </span>
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
