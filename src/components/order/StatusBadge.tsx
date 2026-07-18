import type { OrderStatus } from "@/types";

const MAP: Record<OrderStatus, { label: string; cls: string }> = {
  ordered: { label: "Ordered", cls: "bg-surface text-body" },
  shipped: { label: "Shipped", cls: "bg-white/10 text-white" },
  out_for_delivery: { label: "Out for delivery", cls: "bg-accent/10 text-accent" },
  delivered: { label: "Delivered", cls: "bg-green-500/10 text-green-400" },
  cancelled: { label: "Cancelled", cls: "bg-sale/10 text-sale" },
  returned: { label: "Returned", cls: "bg-surface text-muted" },
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const s = MAP[status];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
