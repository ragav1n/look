import { Link } from "react-router-dom";
import { orders } from "@/lib/fixtures/account";
import { formatPrice } from "@/lib/format";
import StatusBadge from "@/components/order/StatusBadge";

export default function Orders() {
  return (
    <div>
      <h1 className="font-display text-[26px] font-medium text-black">My Orders</h1>
      <p className="mt-1 text-[15px] text-body">Track and manage your recent purchases.</p>

      {orders.length === 0 ? (
        <div className="mt-10 rounded-card bg-card p-10 text-center">
          <p className="text-[16px] font-medium text-black">No orders yet</p>
          <Link to="/shop" className="mt-3 inline-block text-[14px] font-medium text-accent hover:underline">
            Start shopping →
          </Link>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-5">
          {orders.map((order) => (
            <li key={order.id} className="rounded-card border border-line p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                <div>
                  <p className="text-[15px] font-medium text-black">Order {order.id}</p>
                  <p className="text-[13px] text-muted">Placed on {order.placedAt}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {order.items.slice(0, 3).map((it) => (
                      <img
                        key={it.variantId}
                        src={it.image}
                        alt={it.name}
                        className="h-[52px] w-[44px] rounded-[6px] border-2 border-white object-cover object-top"
                      />
                    ))}
                  </div>
                  <p className="text-[14px] text-body">
                    {order.items.length} {order.items.length === 1 ? "item" : "items"} ·{" "}
                    <span className="font-medium text-black">{formatPrice(order.totals.total)}</span>
                  </p>
                </div>
                <Link
                  to={`/account/orders/${order.id}`}
                  className="rounded-btn border border-line px-4 py-2 text-[14px] font-medium text-black transition-colors hover:border-accent hover:text-accent"
                >
                  View details
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
