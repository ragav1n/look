/**
 * Collapse Shopify's several order-state enums into the single `OrderStatus`
 * the UI has always used, and derive a timeline from real timestamps.
 *
 * Shopify describes an order's progress across `cancelledAt`, `fulfillmentStatus`
 * and each fulfilment's `latestShipmentStatus` — there is no one status field and
 * no native timeline. What can't be sourced is left unset rather than invented:
 * a step Shopify reports as reached but never timestamped renders as reached
 * with no time, which is why OrderStep carries `reached` and `at` separately.
 */
import type { OrderStatus, OrderStep } from "@/types";

export interface RawFulfillment {
  createdAt?: string | null;
  updatedAt?: string | null;
  latestShipmentStatus?: string | null;
}

export interface RawOrderState {
  processedAt?: string | null;
  cancelledAt?: string | null;
  fulfillmentStatus?: string | null;
  fulfillments?: RawFulfillment[];
}

/** Shipment statuses that mean the parcel reached the customer. */
const DELIVERED = new Set(["DELIVERED"]);
/** …and those that mean it's on the last leg. ATTEMPTED_DELIVERY counts: the
 *  courier did go out, so the step is genuinely reached. */
const OUT_FOR_DELIVERY = new Set(["OUT_FOR_DELIVERY", "ATTEMPTED_DELIVERY", "READY_FOR_PICKUP"]);

const shipmentStatuses = (o: RawOrderState): string[] =>
  (o.fulfillments ?? []).map((f) => f.latestShipmentStatus ?? "").filter(Boolean);

export function deriveStatus(o: RawOrderState): OrderStatus {
  if (o.cancelledAt) return "cancelled";
  if (o.fulfillmentStatus === "RESTOCKED") return "returned";

  const statuses = shipmentStatuses(o);
  if (statuses.some((s) => DELIVERED.has(s))) return "delivered";
  if (statuses.some((s) => OUT_FOR_DELIVERY.has(s))) return "out_for_delivery";

  if ((o.fulfillments ?? []).length > 0) return "shipped";
  return "ordered";
}

/** Earliest non-null value, or null. Orders can have several fulfilments (a
 *  split shipment); the first one leaving is when the order "shipped". */
function earliest(values: (string | null | undefined)[]): string | null {
  const times = values.filter((v): v is string => Boolean(v));
  if (times.length === 0) return null;
  return times.reduce((a, b) => (new Date(a) <= new Date(b) ? a : b));
}

/**
 * Build the stepper. A cancelled order collapses to placed → cancelled, since
 * showing greyed-out shipping steps under a cancellation reads as "still
 * coming". Returns do the same.
 */
export function deriveTimeline(o: RawOrderState): OrderStep[] {
  const placed: OrderStep = {
    status: "ordered",
    reached: true,
    at: o.processedAt ?? null,
  };

  if (o.cancelledAt) {
    return [placed, { status: "cancelled", reached: true, at: o.cancelledAt }];
  }

  const status = deriveStatus(o);
  if (status === "returned") {
    return [placed, { status: "returned", reached: true, at: null }];
  }

  const fulfillments = o.fulfillments ?? [];
  const statuses = shipmentStatuses(o);
  const isDelivered = statuses.some((s) => DELIVERED.has(s));
  const isOut = isDelivered || statuses.some((s) => OUT_FOR_DELIVERY.has(s));

  /* `updatedAt` is when the fulfilment record last changed, which for a
     delivered parcel is the closest thing Shopify gives to a delivery time.
     It's only used when the shipment status confirms that state — otherwise
     the step stays untimed rather than borrowing an unrelated timestamp. */
  const lastUpdate = earliest(fulfillments.map((f) => f.updatedAt));

  return [
    placed,
    {
      status: "shipped",
      reached: fulfillments.length > 0,
      at: earliest(fulfillments.map((f) => f.createdAt)),
    },
    { status: "out_for_delivery", reached: isOut, at: null },
    { status: "delivered", reached: isDelivered, at: isDelivered ? lastUpdate : null },
  ];
}

/** Humanise Shopify's SCREAMING_SNAKE enums for display, e.g. PARTIALLY_PAID
 *  → "Partially paid". */
export function humanise(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const words = value.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
