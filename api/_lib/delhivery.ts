/**
 * Delhivery status-push → Shopify shipment-status mapping.
 *
 * Delhivery POSTs a scan every time a parcel changes state. Our order tracker
 * (src/lib/customer/orderStatus.ts) is driven ENTIRELY by each fulfilment's
 * `latestShipmentStatus`, which only advances when a Shopify *fulfillment event*
 * exists — manually toggling an order in the admin never writes one. This module
 * turns a Delhivery scan into the Shopify `FulfillmentEventStatus` that the
 * tracker reads, so real delivery progress finally reaches the account page.
 *
 * Payload shape (Delhivery "Tracking via PUSH API"), one scan:
 *   { "Shipment": {
 *       "AWB": "1234567890",
 *       "ReferenceNo": "1001",                     // the order number we manifest with
 *       "NSLCode": "EOD-38",
 *       "Status": {
 *         "Status": "Delivered",
 *         "StatusType": "DL",
 *         "StatusDateTime": "2026-08-03T22:15:04.123",
 *         "StatusLocation": "Chennai_Nolambur_DC (Chennai)",
 *         "Instructions": "Delivered to consignee"
 *       } } }
 * Some accounts batch several scans as `Shipment: [ … ]` — both shapes are handled.
 * The contract is client-configurable on Delhivery's side, so parsing here is
 * defensive: a missing field skips that scan rather than throwing.
 */

/** The subset of Shopify's FulfillmentEventStatus enum we ever emit. Kept narrow
 *  on purpose — these are the only states the tracker (or a human reading the
 *  order) needs, and every value here is stable across Admin API versions. */
export type ShopifyEventStatus =
  | "CONFIRMED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "ATTEMPTED_DELIVERY"
  | "DELIVERED"
  | "FAILURE";

/** A single Delhivery scan, normalised to the handful of fields we use. */
export interface DelhiveryScan {
  awb: string;
  referenceNo: string;
  status: string;
  statusType: string;
  nslCode: string;
  statusDateTime: string;
  location: string;
  instructions: string;
}

/* Loose views of the raw payload — every field optional because a webhook body
   is untrusted input, not a typed struct. */
interface RawStatus {
  Status?: unknown;
  StatusType?: unknown;
  StatusDateTime?: unknown;
  StatusLocation?: unknown;
  Instructions?: unknown;
}
interface RawShipment {
  AWB?: unknown;
  Waybill?: unknown; // some payloads name it Waybill
  ReferenceNo?: unknown;
  NSLCode?: unknown;
  Status?: RawStatus | unknown;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Pull the `Shipment` value out of a push body as an array — Delhivery sends
 *  either one object or a batch, and callers shouldn't care which. */
export function shipmentsOf(body: unknown): RawShipment[] {
  const shipment = (body as { Shipment?: unknown } | null)?.Shipment;
  if (Array.isArray(shipment)) return shipment as RawShipment[];
  if (shipment && typeof shipment === "object") return [shipment as RawShipment];
  return [];
}

/** Normalise one raw shipment to a DelhiveryScan, or null if it lacks the two
 *  fields we can't proceed without: an identifier (AWB or ReferenceNo) and a
 *  status. */
export function parseScan(raw: RawShipment): DelhiveryScan | null {
  const s = (raw.Status ?? {}) as RawStatus;
  const awb = str(raw.AWB) || str(raw.Waybill);
  const referenceNo = str(raw.ReferenceNo);
  const status = str(s.Status);
  if (!status || (!awb && !referenceNo)) return null;
  return {
    awb,
    referenceNo,
    status,
    statusType: str(s.StatusType).toUpperCase(),
    nslCode: str(raw.NSLCode),
    statusDateTime: str(s.StatusDateTime),
    location: str(s.StatusLocation),
    instructions: str(s.Instructions),
  };
}

/**
 * Map a Delhivery scan to a Shopify event status, or null to SKIP it (an
 * acknowledged no-op — the parcel moved, but not in a way the tracker shows).
 *
 * Matching is keyed on the human-readable `Status` string first (the most
 * reliable signal Delhivery gives) and falls back to the coarse `StatusType`
 * bucket. This table is the ONE place to tune the mapping — edit here, nowhere
 * else. Delhivery's own vocabulary, for reference:
 *   StatusType  DL = Delivered · RT = Return/RTO · UD = Undelivered (in transit)
 *               PU/PP = Pickup · scans carry a "Status" like Manifested /
 *               In Transit / Pending / Dispatched / Delivered / RTO.
 * Note "Dispatched" is Delhivery's wording for out-for-delivery, and
 * "Undelivered" for a failed delivery attempt.
 */
export function mapToShopifyStatus(scan: Pick<DelhiveryScan, "status" | "statusType">): ShopifyEventStatus | null {
  const s = scan.status.toLowerCase();
  const type = scan.statusType;

  // Returns to origin (RTO) aren't a delivery to the customer, and our timeline
  // has no step for them — skip so we don't write a misleading "delivered".
  if (type === "RT" || s.includes("rto") || s.includes("return")) return null;

  // Delivered — StatusType DL is authoritative; guard the string form against
  // "undelivered", which contains "delivered".
  if (type === "DL" || (s.includes("delivered") && !s.includes("undelivered"))) return "DELIVERED";

  // Out for delivery — Delhivery says "Dispatched" (out with the rider).
  if (s.includes("out for delivery") || s.includes("dispatched")) return "OUT_FOR_DELIVERY";

  // Failed delivery attempt.
  if (s.includes("undelivered") || s.includes("attempt")) return "ATTEMPTED_DELIVERY";

  // Order info received / label made / awaiting pickup — the shipment exists but
  // hasn't moved yet.
  if (s.includes("manifest") || s.includes("not picked") || type === "PU" || type === "PP") return "CONFIRMED";

  // Anything else that's genuinely an in-transit update (UD bucket, "In Transit",
  // "Pending", "In Scan", a pickup scan) collapses to IN_TRANSIT. This keeps the
  // tracker at "Shipped" while still recording the movement on the order.
  if (type === "UD" || s.includes("transit") || s.includes("pending") || s.includes("picked") || s.includes("scan")) {
    return "IN_TRANSIT";
  }

  return null; // unrecognised — acknowledged and ignored
}

/**
 * Delhivery timestamps look like "2026-08-03T22:15:04.123" — ISO-ish but with NO
 * timezone, and they're IST (UTC+5:30). Append the offset so Shopify records the
 * correct instant instead of reading it as UTC (which would be 5.5h early).
 * Returns undefined for anything unparseable, letting Shopify default to "now".
 */
export function toIso(statusDateTime: string): string | undefined {
  if (!statusDateTime) return undefined;
  const hasZone = /[zZ]|[+-]\d\d:?\d\d$/.test(statusDateTime);
  const candidate = hasZone ? statusDateTime : `${statusDateTime}+05:30`;
  const t = Date.parse(candidate);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

/** Best-effort city from a StatusLocation like "Chennai_Nolambur_DC (Chennai)".
 *  Prefer the parenthetical (the human city); else the first token. Purely for a
 *  nicer event on the order — never required. */
export function locationCity(location: string): string | undefined {
  if (!location) return undefined;
  const paren = location.match(/\(([^)]+)\)/);
  if (paren) return paren[1].trim();
  const first = location.split(/[_(]/)[0]?.trim();
  return first || undefined;
}
