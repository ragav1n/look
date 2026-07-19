import { useState } from "react";
import { Link } from "react-router-dom";
import type { OrderPage } from "@/lib/customer";
import { getOrders } from "@/lib/customer";
import { formatMoney } from "@/lib/format";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/context/ToastContext";
import StatusBadge from "@/components/order/StatusBadge";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";

const formatDate = (iso: string): string =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "";

export default function Orders() {
  const first = useAsyncData(() => getOrders(), []);
  const { push } = useToast();

  /* Pages fetched by "Load more", tied to the first page they extend. Deriving
     the reset during render rather than in an effect means a reload can't leave
     a stale second page appended to a fresh first one. */
  const [appended, setAppended] = useState<{ from?: OrderPage; pages: OrderPage[] }>({ pages: [] });
  const extra = appended.from === first.data ? appended.pages : [];
  const [loadingMore, setLoadingMore] = useState(false);

  const pages = first.data ? [first.data, ...extra] : [];
  const orders = pages.flatMap((p) => p.orders);
  const last = pages[pages.length - 1];

  const loadMore = async () => {
    if (!last || !first.data) return;
    setLoadingMore(true);
    try {
      const next = await getOrders(last.cursor);
      setAppended({ from: first.data, pages: [...extra, next] });
    } catch (err) {
      /* The orders already on screen are fine — only the next page failed, so
         this is exactly the invisible failure a toast is for. */
      push(err instanceof Error ? err.message : "We couldn't load more orders.");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-[26px] font-medium text-white">My Orders</h1>
      <p className="mt-1 text-[15px] text-body">Track and manage your recent purchases.</p>

      {/* An outage must never render as "No orders yet" — that reads as though
          the customer's order history was lost. */}
      {first.error ? (
        <LoadError
          title="We couldn't load your orders"
          message="Something went wrong reaching the store. Your orders are safe."
          onRetry={first.reload}
        />
      ) : first.loading ? (
        <ul className="mt-8 flex flex-col gap-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </ul>
      ) : orders.length === 0 ? (
        <div className="mt-10 rounded-card bg-card p-10 text-center">
          <p className="text-[16px] font-medium text-white">No orders yet</p>
          <p className="mt-1 text-[14px] text-body">
            When you place an order, it’ll show up here with live tracking.
          </p>
          <Link
            to="/shop"
            className="mt-4 inline-block text-[14px] font-medium text-accent hover:underline"
          >
            Start shopping →
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-8 flex flex-col gap-5">
            {orders.map((order) => (
              <li key={order.id} className="rounded-card border border-line p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <p className="text-[15px] font-medium text-white">Order {order.number}</p>
                    <p className="text-[13px] text-muted">Placed on {formatDate(order.placedAt)}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                      {order.items.slice(0, 3).map((it, i) => (
                        <img
                          key={it.variantId ?? `${order.id}-${i}`}
                          src={it.image}
                          alt={it.name}
                          className="h-[52px] w-[44px] rounded-[6px] border-2 border-surface object-cover object-top"
                        />
                      ))}
                    </div>
                    <p className="text-[14px] text-body">
                      {order.items.length} {order.items.length === 1 ? "item" : "items"} ·{" "}
                      <span className="font-medium text-white">{formatMoney(order.totals.total)}</span>
                    </p>
                  </div>
                  <Link
                    to={`/account/orders/${order.reference}`}
                    className="rounded-btn border border-line px-4 py-2 text-[14px] font-medium text-white transition-colors hover:border-accent hover:text-accent"
                  >
                    View details
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          {last?.hasNextPage && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="h-[44px] cursor-pointer rounded-btn border border-line px-6 text-[14px] font-medium text-white transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : "Load more orders"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OrderCardSkeleton() {
  return (
    <li className="rounded-card border border-line p-5">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-[140px]" />
          <Skeleton className="h-3 w-[110px]" />
        </div>
        <Skeleton className="h-6 w-[80px] rounded-full" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-[52px] w-[44px]" />
          <Skeleton className="h-4 w-[120px]" />
        </div>
        <Skeleton className="h-9 w-[110px]" />
      </div>
    </li>
  );
}
