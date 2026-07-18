import { Link, useParams } from "react-router-dom";
import type { OrderStatus } from "@/types";
import { getOrder } from "@/lib/fixtures/account";
import { formatPrice } from "@/lib/format";
import StatusBadge from "@/components/order/StatusBadge";

const STEP_LABEL: Record<OrderStatus, string> = {
  ordered: "Order placed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export default function OrderDetail() {
  const { orderId = "" } = useParams();
  const order = getOrder(orderId);

  if (!order) {
    return (
      <div className="rounded-card bg-card p-10 text-center">
        <p className="text-[16px] font-medium text-white">Order not found</p>
        <Link to="/account/orders" className="mt-3 inline-block text-[14px] text-accent hover:underline">
          ← Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/account/orders" className="text-[13px] text-muted hover:text-accent">
        ← Back to orders
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-medium text-white">Order {order.id}</h1>
          <p className="mt-1 text-[14px] text-muted">Placed on {order.placedAt}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Timeline */}
      <div className="mt-8 rounded-card border border-line p-6">
        <h2 className="text-[16px] font-medium text-white">Tracking</h2>
        {order.courier && (
          <p className="mt-1 text-[14px] text-body">
            {order.courier.name} · AWB {order.courier.trackingId}
          </p>
        )}
        <ol className="mt-5 flex flex-col gap-0">
          {order.timeline.map((step, i) => {
            const done = step.at !== null;
            const last = i === order.timeline.length - 1;
            return (
              <li key={step.status} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      done ? "border-accent bg-accent" : "border-line bg-surface"
                    }`}
                  >
                    {done && <span className="size-1.5 rounded-full bg-surface" />}
                  </span>
                  {!last && <span className={`w-0.5 flex-1 ${done ? "bg-accent" : "bg-line"}`} />}
                </div>
                <div className={`pb-6 ${last ? "" : ""}`}>
                  <p className={`text-[15px] ${done ? "font-medium text-white" : "text-muted"}`}>
                    {STEP_LABEL[step.status]}
                  </p>
                  {step.at && (
                    <p className="text-[13px] text-muted">
                      {new Date(step.at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {order.shipmentUpdates.length > 0 && (
          <div className="mt-2 border-t border-line pt-4">
            <p className="text-[13px] font-medium text-heading-soft">Shipment updates</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {order.shipmentUpdates.map((u) => (
                <li key={u.at} className="text-[13px] text-body">
                  <span className="text-muted">
                    {new Date(u.at).toLocaleDateString("en-IN", { dateStyle: "medium" })} —{" "}
                  </span>
                  {u.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="mt-6 rounded-card border border-line p-6">
        <h2 className="text-[16px] font-medium text-white">Items</h2>
        <ul className="mt-4 flex flex-col divide-y divide-line">
          {order.items.map((it) => (
            <li key={it.variantId} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              <Link
                to={`/shop/${it.productSlug}`}
                className="h-[88px] w-[70px] shrink-0 overflow-hidden rounded-img bg-card"
              >
                <img src={it.image} alt={it.name} className="h-full w-full object-cover object-top" />
              </Link>
              <div className="flex flex-1 items-start justify-between gap-4">
                <div>
                  <Link
                    to={`/shop/${it.productSlug}`}
                    className="text-[15px] font-medium text-white hover:text-accent"
                  >
                    {it.name}
                  </Link>
                  <p className="mt-1 text-[13px] text-muted">
                    {[it.color, it.size].filter(Boolean).join(" · ")} · Qty {it.quantity}
                  </p>
                </div>
                <p className="text-[15px] font-medium text-white">{formatPrice(it.price)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Summary + address */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-card border border-line p-6">
          <h2 className="text-[16px] font-medium text-white">Delivery address</h2>
          <p className="mt-3 text-[14px] leading-[22px] text-body">
            <span className="font-medium text-white">{order.address.name}</span>
            <br />
            {order.address.line1}
            {order.address.line2 ? `, ${order.address.line2}` : ""}
            <br />
            {order.address.city}, {order.address.state} {order.address.pincode}
            <br />
            {order.address.phone}
          </p>
        </div>
        <div className="rounded-card border border-line p-6">
          <h2 className="text-[16px] font-medium text-white">Payment summary</h2>
          <dl className="mt-3 flex flex-col gap-2 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-body">Subtotal</dt>
              <dd className="text-white">{formatPrice(order.totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-body">Shipping</dt>
              <dd className="text-white">
                {order.totals.shipping === 0 ? "Free" : formatPrice(order.totals.shipping)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-body">Taxes</dt>
              <dd className="text-white">{formatPrice(order.totals.taxes)}</dd>
            </div>
            <div className="mt-1 flex justify-between border-t border-line pt-2">
              <dt className="font-medium text-white">Total</dt>
              <dd className="font-medium text-white">{formatPrice(order.totals.total)}</dd>
            </div>
            <p className="mt-1 text-[13px] text-muted">Paid via {order.paymentMethod}</p>
          </dl>
        </div>
      </div>
    </div>
  );
}
