/**
 * Admin API helpers for the Delhivery → Shopify fulfillment-event bridge.
 *
 * Two operations, both server-only (they read orders and write fulfillment
 * events, so they must never touch the browser bundle):
 *   1. findFulfillmentForShipment — turn a Delhivery scan (order ref + AWB) into
 *      the Shopify fulfillment id its event must attach to.
 *   2. createFulfillmentEvent — write that event, which is what finally moves the
 *      customer-facing `latestShipmentStatus`.
 *
 * Requires the Admin app to hold `read_orders` + `write_fulfillments` (the
 * newsletter app's customer scopes are NOT enough — see docs/delhivery.md).
 */
import { adminGraphql } from "./shopify.js";
import type { ShopifyEventStatus } from "./delhivery.js";

/** Where a scan should land, plus the current state we use for de-duping. */
export interface FulfillmentMatch {
  orderName: string;
  fulfillmentId: string;
  /** Status of the most recent existing event on that fulfilment, if any — lets
   *  the caller skip re-writing a status the fulfilment already has. */
  latestEventStatus: string | null;
}

interface RawFulfillment {
  id: string;
  status: string | null;
  trackingInfo: { number: string | null }[];
  events: { nodes: { status: string | null }[] };
}

const FIND_QUERY = /* GraphQL */ `
  query FindFulfillment($q: String!) {
    orders(first: 5, query: $q) {
      nodes {
        id
        name
        fulfillments(first: 10) {
          id
          status
          trackingInfo(first: 10) { number }
          events(first: 1, sortKey: HAPPENED_AT, reverse: true) {
            nodes { status }
          }
        }
      }
    }
  }
`;

/** Strip a leading '#' and any surrounding whitespace from an order reference so
 *  "1001", "#1001" and " #1001 " all search the same order. */
const orderNumber = (ref: string): string => ref.replace(/^#/, "").trim();

/** What an order name may contain once the '#' is off: digits normally, letters
 *  and separators if the store ever sets an order prefix/suffix. Deliberately
 *  NOT `^\d+$` — that would silently stop the webhook matching anything the day
 *  someone configures one.
 *
 *  The point is what it excludes. `number` is interpolated into the Admin
 *  *search* string below, where quotes, spaces, colons and parens are operators;
 *  a crafted ReferenceNo could otherwise widen the query and, via the
 *  "or the first result" fallback, land a scan on an unrelated order. */
const ORDER_NAME_RE = /^[A-Za-z0-9._-]+$/;

/**
 * Locate the fulfilment a Delhivery scan belongs to.
 *
 * Primary key is the order number carried in Delhivery's `ReferenceNo` (which we
 * set to the Shopify order name at manifest time) — Shopify has no way to search
 * orders by tracking number, so the reference is how the two systems join. Among
 * that order's fulfilments we then prefer the one whose tracking number equals
 * the AWB; failing that (AWB not written to the fulfilment) we take the single
 * fulfilment, or the most recent one. Returns null when nothing can be matched.
 */
export async function findFulfillmentForShipment(args: {
  referenceNo: string;
  awb: string;
}): Promise<FulfillmentMatch | null> {
  const number = orderNumber(args.referenceNo);
  if (!ORDER_NAME_RE.test(number)) return null; // absent or not a name ⇒ nothing to join on

  const res = await adminGraphql(FIND_QUERY, { q: `name:#${number}` });
  const json = (await res.json()) as {
    data?: { orders?: { nodes?: { id: string; name: string; fulfillments: RawFulfillment[] }[] } };
    errors?: { message: string }[];
  };
  if (json.errors?.length) {
    throw new Error(`admin order lookup failed: ${json.errors.map((e) => e.message).join("; ")}`);
  }

  // Exact name match first — `name:#1001` can also surface #11001 etc. via
  // Shopify's fuzzy search, so pin it to the exact order name.
  const orders = json.data?.orders?.nodes ?? [];
  const order = orders.find((o) => orderNumber(o.name) === number) ?? orders[0];
  if (!order) return null;

  const fulfillments = order.fulfillments ?? [];
  if (fulfillments.length === 0) return null;

  const byAwb = args.awb
    ? fulfillments.find((f) => f.trackingInfo?.some((t) => t.number === args.awb))
    : undefined;
  // AWB match > the only fulfilment > the last one created (arrays come back in
  // creation order, so the tail is newest).
  const chosen = byAwb ?? (fulfillments.length === 1 ? fulfillments[0] : fulfillments[fulfillments.length - 1]);

  return {
    orderName: order.name,
    fulfillmentId: chosen.id,
    latestEventStatus: chosen.events?.nodes?.[0]?.status ?? null,
  };
}

const CREATE_MUTATION = /* GraphQL */ `
  mutation FulfillmentEventCreate($input: FulfillmentEventInput!) {
    fulfillmentEventCreate(fulfillmentEvent: $input) {
      fulfillmentEvent { id status happenedAt }
      userErrors { field message }
    }
  }
`;

export interface CreateEventResult {
  ok: boolean;
  userErrors: { field?: string[] | null; message: string }[];
}

/** Write a shipment event onto a fulfilment. `happenedAt`/`message`/`city` are
 *  optional colour; only `fulfillmentId` + `status` are required by Shopify. */
export async function createFulfillmentEvent(input: {
  fulfillmentId: string;
  status: ShopifyEventStatus;
  happenedAt?: string;
  message?: string;
  city?: string;
}): Promise<CreateEventResult> {
  const res = await adminGraphql(CREATE_MUTATION, {
    input: {
      fulfillmentId: input.fulfillmentId,
      status: input.status,
      ...(input.happenedAt ? { happenedAt: input.happenedAt } : {}),
      ...(input.message ? { message: input.message } : {}),
      ...(input.city ? { city: input.city } : {}),
    },
  });
  const json = (await res.json()) as {
    data?: { fulfillmentEventCreate?: { fulfillmentEvent?: { id: string } | null; userErrors?: CreateEventResult["userErrors"] } };
    errors?: { message: string }[];
  };
  if (json.errors?.length) {
    throw new Error(`fulfillmentEventCreate failed: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  const payload = json.data?.fulfillmentEventCreate;
  return { ok: Boolean(payload?.fulfillmentEvent?.id), userErrors: payload?.userErrors ?? [] };
}
