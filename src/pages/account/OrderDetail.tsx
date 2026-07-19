import { Link, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import type { Money, OrderStatus } from "@/types";
import { getOrder } from "@/lib/customer";
import { getProductHandles } from "@/lib/catalog";
import { formatMoney, formatPhone } from "@/lib/format";
import { useAsyncData } from "@/hooks/useAsyncData";
import StatusBadge from "@/components/order/StatusBadge";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";

const STEP_LABEL: Record<OrderStatus, string> = {
  ordered: "Order placed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

const formatDate = (iso: string): string =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "";

/** Shipping is often genuinely free; showing "Rs. 0" reads like a missing value. */
const shippingLabel = (m: Money): string => (m.amount === 0 ? "Free" : formatMoney(m));

export default function OrderDetail() {
  const { orderId = "" } = useParams();

  /* The URL carries the numeric half of the order GID — a full GID has slashes
     and can't sit in a path segment. */
  const { data, loading, error, reload } = useAsyncData(async () => {
    const order = await getOrder(`gid://shopify/Order/${orderId}`);
    if (!order) return null;

    /* Line items carry no product handle, so resolve them separately. Failure
       here costs the links, not the page — getProductHandles returns {}. */
    const handles = await getProductHandles(
      order.items.map((i) => i.productId).filter((id): id is string => Boolean(id)),
    );
    return {
      ...order,
      items: order.items.map((i) => ({
        ...i,
        productSlug: i.productSlug ?? (i.productId ? handles[i.productId] : undefined),
      })),
    };
  }, [orderId]);

  if (loading) return <OrderDetailSkeleton />;

  /* A fetch failure is not the same as "this order doesn't exist" — telling
     someone their order is gone when the store is merely unreachable is a lie
     they can't recover from. */
  if (error) {
    return (
      <LoadError
        title="We couldn't load this order"
        message="Something went wrong reaching the store. Your order is safe."
        onRetry={reload}
      />
    );
  }

  if (!data) {
    return (
      <div className="rounded-card bg-card p-10 text-center">
        <p className="text-[16px] font-medium text-white">Order not found</p>
        <p className="mt-1 text-[14px] text-body">
          This order isn’t on your account. It may belong to a different sign-in.
        </p>
        <Link to="/account/orders" className="mt-3 inline-block text-[14px] text-accent hover:underline">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const order = data;
  const { tracking } = order;

  return (
    <div>
      <Link to="/account/orders" className="text-[13px] text-muted hover:text-accent">
        ← Back to orders
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-medium text-white">Order {order.number}</h1>
          <p className="mt-1 text-[14px] text-muted">Placed on {formatDate(order.placedAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Tracking */}
      <div className="mt-8 rounded-card border border-line p-6">
        <h2 className="text-[16px] font-medium text-white">Tracking</h2>
        {tracking?.company && (
          <p className="mt-1 text-[14px] text-body">
            {tracking.company}
            {tracking.number ? ` · AWB ${tracking.number}` : ""}
          </p>
        )}

        <ol className="mt-5 flex flex-col gap-0">
          {order.timeline.map((step, i) => {
            const last = i === order.timeline.length - 1;
            return (
              <li key={step.status} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      step.reached ? "border-accent bg-accent" : "border-line bg-surface"
                    }`}
                  >
                    {step.reached && <span className="size-1.5 rounded-full bg-surface" />}
                  </span>
                  {!last && <span className={`w-0.5 flex-1 ${step.reached ? "bg-accent" : "bg-line"}`} />}
                </div>
                <div className="pb-6">
                  <p className={`text-[15px] ${step.reached ? "font-medium text-white" : "text-muted"}`}>
                    {STEP_LABEL[step.status]}
                  </p>
                  {/* A step can be reached without Shopify saying when — the dot
                      fills, the timestamp simply doesn't appear. */}
                  {step.at && <p className="text-[13px] text-muted">{formatDateTime(step.at)}</p>}
                </div>
              </li>
            );
          })}
        </ol>

        {(tracking?.url || order.statusPageUrl) && (
          <div className="mt-2 flex flex-wrap gap-3 border-t border-line pt-4">
            {tracking?.url && (
              <a
                href={tracking.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-btn border border-line px-4 py-2 text-[13px] font-medium text-white transition-colors hover:border-accent hover:text-accent"
              >
                Track with {tracking.company ?? "carrier"}
                <ExternalLink className="size-3.5" />
              </a>
            )}
            {order.statusPageUrl && (
              <a
                href={order.statusPageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-btn border border-line px-4 py-2 text-[13px] font-medium text-body transition-colors hover:border-accent hover:text-accent"
              >
                Order status page
                <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="mt-6 rounded-card border border-line p-6">
        <h2 className="text-[16px] font-medium text-white">Items</h2>
        <ul className="mt-4 flex flex-col divide-y divide-line">
          {order.items.map((it, i) => {
            const thumb = (
              <img src={it.image} alt={it.name} className="h-full w-full object-cover object-top" />
            );
            return (
              <li key={it.variantId ?? `${order.id}-${i}`} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                {/* Unlinked when the product was deleted, unpublished, or the
                    handle lookup failed — the row still renders in full. */}
                {it.productSlug ? (
                  <Link
                    to={`/shop/${it.productSlug}`}
                    className="h-[88px] w-[70px] shrink-0 overflow-hidden rounded-img bg-card"
                  >
                    {thumb}
                  </Link>
                ) : (
                  <div className="h-[88px] w-[70px] shrink-0 overflow-hidden rounded-img bg-card">
                    {thumb}
                  </div>
                )}
                <div className="flex flex-1 items-start justify-between gap-4">
                  <div>
                    {it.productSlug ? (
                      <Link
                        to={`/shop/${it.productSlug}`}
                        className="text-[15px] font-medium text-white hover:text-accent"
                      >
                        {it.name}
                      </Link>
                    ) : (
                      <p className="text-[15px] font-medium text-white">{it.name}</p>
                    )}
                    <p className="mt-1 text-[13px] text-muted">
                      {[it.color, it.size].filter(Boolean).join(" · ")}
                      {[it.color, it.size].filter(Boolean).length > 0 ? " · " : ""}
                      Qty {it.quantity}
                    </p>
                  </div>
                  <p className="text-[15px] font-medium text-white">{formatMoney(it.price)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Summary + address */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-card border border-line p-6">
          <h2 className="text-[16px] font-medium text-white">Delivery address</h2>
          {order.address ? (
            <p className="mt-3 text-[14px] leading-[22px] text-body">
              <span className="font-medium text-white">{order.address.name}</span>
              <br />
              {order.address.line1}
              {order.address.line2 ? `, ${order.address.line2}` : ""}
              <br />
              {order.address.city}, {order.address.state} {order.address.pincode}
              {order.address.phone && (
                <>
                  <br />
                  {formatPhone(order.address.phone)}
                </>
              )}
            </p>
          ) : (
            <p className="mt-3 text-[14px] text-muted">No delivery address on this order.</p>
          )}
        </div>

        <div className="rounded-card border border-line p-6">
          <h2 className="text-[16px] font-medium text-white">Payment summary</h2>
          <dl className="mt-3 flex flex-col gap-2 text-[14px]">
            {order.totals.subtotal && (
              <div className="flex justify-between">
                <dt className="text-body">Subtotal</dt>
                <dd className="text-white">{formatMoney(order.totals.subtotal)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-body">Shipping</dt>
              <dd className="text-white">{shippingLabel(order.totals.shipping)}</dd>
            </div>
            {order.totals.taxes && (
              <div className="flex justify-between">
                <dt className="text-body">Taxes</dt>
                <dd className="text-white">{formatMoney(order.totals.taxes)}</dd>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-line pt-2">
              <dt className="font-medium text-white">Total</dt>
              <dd className="font-medium text-white">{formatMoney(order.totals.total)}</dd>
            </div>
            {/* Shopify exposes no payment *method*, so we report the status. */}
            {order.paymentStatus && (
              <p className="mt-1 text-[13px] text-muted">Payment: {order.paymentStatus}</p>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div>
      <Skeleton className="h-3 w-[90px]" />
      <div className="mt-4 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-[180px]" />
          <Skeleton className="h-3 w-[130px]" />
        </div>
        <Skeleton className="h-6 w-[80px] rounded-full" />
      </div>
      <div className="mt-8 rounded-card border border-line p-6">
        <Skeleton className="h-4 w-[80px]" />
        <div className="mt-5 flex flex-col gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 rounded-card border border-line p-6">
        <Skeleton className="h-4 w-[60px]" />
        <div className="mt-4 flex gap-4">
          <Skeleton className="h-[88px] w-[70px]" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-[160px]" />
            <Skeleton className="h-3 w-[120px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
