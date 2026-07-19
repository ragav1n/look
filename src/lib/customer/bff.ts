/**
 * Live customer auth — talks ONLY to the same-origin /api BFF, never to Shopify
 * directly and never to a token. The browser holds no credentials: httpOnly
 * cookies ride along automatically with `credentials: "include"`.
 */
import type { Address, AddressInput, Money, Order, OrderItem, UserProfile } from "@/types";
import { stateCodeFor, stateNameFor } from "@/data/indianStates";
import { deriveStatus, deriveTimeline, humanise, type RawOrderState } from "./orderStatus";
import {
  ADDRESS_CREATE,
  ADDRESS_DELETE,
  ADDRESS_UPDATE,
  ADDRESSES_QUERY,
  DEFAULT_ADDRESS_UPDATE,
  ORDER_QUERY,
  ORDERS_QUERY,
} from "./queries";
import type { OrderPage, Session } from "./types";

const api = (path: string, init?: RequestInit) =>
  fetch(path, { credentials: "include", ...init });

const jsonInit = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export async function getSession(): Promise<Session> {
  try {
    const res = await api("/api/auth/session");
    if (!res.ok) return { authenticated: false, profile: null };
    const json = (await res.json()) as { authenticated?: boolean; profile?: UserProfile };
    if (!json.authenticated || !json.profile) return { authenticated: false, profile: null };
    return { authenticated: true, profile: json.profile };
  } catch {
    return { authenticated: false, profile: null };
  }
}

export function beginLogin(from?: string): void {
  const redirect = from && from.startsWith("/") ? from : "/account/profile";
  window.location.assign(`/api/auth/login?redirect=${encodeURIComponent(redirect)}`);
}

export async function logout(): Promise<void> {
  try {
    const res = await api("/api/auth/logout", { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as { logoutUrl?: string };
    window.location.assign(json.logoutUrl ?? "/");
  } catch {
    window.location.assign("/");
  }
}

interface GraphQLEnvelope<T> {
  data?: T;
  /** Top-level GraphQL errors (bad query shape, missing scope) — distinct from
   *  userErrors, which are per-field validation failures. */
  errors?: { message: string }[];
  /** The BFF's own error envelope, e.g. `{error:"unauthenticated"}` on a 401. */
  error?: string;
}

/**
 * Run one operation through the BFF and hand back `data`.
 *
 * Every read and write goes through here so they share one error ladder:
 * 401 → session expired, then top-level `errors`, then the BFF envelope. This
 * is what makes an otherwise-silent failure — a missing `customer_write_customers`
 * scope, say — legible instead of looking like an empty result. Per-field
 * `userErrors` live inside `data` and are unwrapped by `mutate` below.
 *
 * `context` completes the sentence "We couldn't <context>".
 */
async function customerGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
  context: string,
): Promise<T> {
  const res = await api("/api/customer/graphql", jsonInit({ query, variables }));
  const json = (await res.json().catch(() => ({}))) as GraphQLEnvelope<T>;

  if (res.status === 401) throw new Error("Your session expired. Please sign in again.");

  if (!json.data) {
    const detail = json.errors?.map((e) => e.message).join("; ") || json.error;
    throw new Error(
      detail ? `We couldn't ${context}: ${detail}` : `We couldn't ${context}. Please try again.`,
    );
  }
  return json.data;
}

interface MutationPayload {
  userErrors?: { field?: string[] | null; message: string }[];
}

/** Run a mutation and unwrap its payload, turning `userErrors` into a throw.
 *  Shopify reports validation failures here with HTTP 200, so a mutation that
 *  skips this check looks like it succeeded. */
async function mutate<P extends MutationPayload>(
  query: string,
  variables: Record<string, unknown>,
  field: string,
  context: string,
): Promise<P> {
  const data = await customerGraphql<Record<string, P | null>>(query, variables, context);
  const payload = data[field];
  if (!payload) throw new Error(`We couldn't ${context}. Please try again.`);
  if (payload.userErrors?.length) {
    throw new Error(payload.userErrors.map((e) => e.message).join("; "));
  }
  return payload;
}

/* Only the customer's name is updatable through the Customer Account API in a
   headless flow (email/phone are identity-managed). We map "First Last" → the
   firstName/lastName input and keep the server's email/phone. */
const CUSTOMER_UPDATE = /* GraphQL */ `
  mutation CustomerUpdate($input: CustomerUpdateInput!) {
    customerUpdate(input: $input) {
      customer {
        firstName
        lastName
        emailAddress { emailAddress }
        phoneNumber { phoneNumber }
      }
      userErrors { field message }
    }
  }
`;

interface RawProfile {
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: { emailAddress?: string | null } | null;
  phoneNumber?: { phoneNumber?: string | null } | null;
}

/** Split a display name into the firstName/lastName pair Shopify wants. Used
 *  for both the customer profile and address contacts. */
function splitName(name: string): { firstName: string; lastName: string } {
  const [first, ...rest] = name.trim().split(/\s+/);
  return { firstName: first ?? "", lastName: rest.join(" ") };
}

const joinName = (first?: string | null, last?: string | null): string =>
  [first, last].filter(Boolean).join(" ");

export async function updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
  const input: Record<string, string> = {};
  if (patch.name != null) Object.assign(input, splitName(patch.name));

  const payload = await mutate<MutationPayload & { customer?: RawProfile | null }>(
    CUSTOMER_UPDATE,
    { input },
    "customerUpdate",
    "save your profile",
  );

  const c = payload.customer;
  if (!c) throw new Error("We couldn't save your profile. Please try again.");
  return {
    name: joinName(c.firstName, c.lastName),
    email: c.emailAddress?.emailAddress ?? patch.email ?? "",
    phone: c.phoneNumber?.phoneNumber ?? patch.phone ?? "",
  };
}

/* Best-effort: checkout still works even if linking fails, so errors are
   swallowed rather than surfaced. */
export async function linkCart(cartId: string): Promise<void> {
  try {
    await api("/api/cart/link", jsonInit({ cartId }));
  } catch {
    /* non-blocking */
  }
}

export async function unlinkCart(cartId: string): Promise<void> {
  try {
    await api("/api/cart/link", jsonInit({ cartId, unlink: true }));
  } catch {
    /* non-blocking */
  }
}

/* ------------------------------------------------------------------ *
 * Orders                                                              *
 * ------------------------------------------------------------------ */

interface RawMoney {
  amount: string;
  currencyCode: string;
}

interface RawLineItem {
  id: string;
  name: string;
  quantity: number;
  productId?: string | null;
  variantId?: string | null;
  image?: { url?: string | null; altText?: string | null } | null;
  price?: RawMoney | null;
  variantOptions?: { name: string; value: string }[] | null;
}

interface RawAddress {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  zoneCode?: string | null;
  zip?: string | null;
  phoneNumber?: string | null;
}

interface RawOrder extends RawOrderState {
  id: string;
  name: string;
  totalPrice: RawMoney;
  statusPageUrl?: string | null;
  subtotal?: RawMoney | null;
  totalTax?: RawMoney | null;
  totalShipping?: RawMoney | null;
  shippingAddress?: RawAddress | null;
  paymentInformation?: { paymentStatus?: string | null } | null;
  lineItems?: { nodes: RawLineItem[] } | null;
  fulfillments?: {
    createdAt?: string | null;
    updatedAt?: string | null;
    latestShipmentStatus?: string | null;
    trackingInformation?: { company?: string | null; number?: string | null; url?: string | null }[];
  }[];
}

const toMoney = (m: RawMoney | null | undefined): Money | null =>
  m ? { amount: Number(m.amount), currencyCode: m.currencyCode } : null;

/** Money that Shopify guarantees non-null. Falls back to zero in the order's
 *  own currency rather than throwing — a missing figure shouldn't lose the page. */
const toMoneyOr0 = (m: RawMoney | null | undefined, currencyCode: string): Money =>
  toMoney(m) ?? { amount: 0, currencyCode };

/** Pull a named variant option, e.g. "Size" → "M". Shopify preserves the option
 *  names the merchant configured, so match case-insensitively. */
function option(item: RawLineItem, ...names: string[]): string {
  const wanted = names.map((n) => n.toLowerCase());
  const hit = (item.variantOptions ?? []).find((o) => wanted.includes(o.name.toLowerCase()));
  return hit?.value ?? "";
}

/** `gid://shopify/Order/12345` → `12345`, the URL-safe half of the id. */
const referenceOf = (gid: string): string => gid.split("/").pop() ?? gid;

function toOrderItem(raw: RawLineItem, currencyCode: string): OrderItem {
  return {
    productId: raw.productId ?? null,
    variantId: raw.variantId ?? null,
    name: raw.name,
    image: raw.image?.url ?? "",
    size: option(raw, "Size"),
    color: option(raw, "Color", "Colour"),
    quantity: raw.quantity,
    price: toMoneyOr0(raw.price, currencyCode),
  };
}

function toOrder(raw: RawOrder): Order {
  const currency = raw.totalPrice.currencyCode;
  const fulfillments = raw.fulfillments ?? [];
  /* The first fulfilment carrying tracking wins — split shipments are rare
     enough here that showing one carrier beats showing none. */
  const tracking = fulfillments.flatMap((f) => f.trackingInformation ?? [])[0];

  return {
    id: raw.id,
    number: raw.name,
    reference: referenceOf(raw.id),
    placedAt: raw.processedAt ?? "",
    status: deriveStatus(raw),
    items: (raw.lineItems?.nodes ?? []).map((n) => toOrderItem(n, currency)),
    address: raw.shippingAddress ? toAddress(raw.shippingAddress) : null,
    totals: {
      subtotal: toMoney(raw.subtotal),
      shipping: toMoneyOr0(raw.totalShipping, currency),
      taxes: toMoney(raw.totalTax),
      total: toMoneyOr0(raw.totalPrice, currency),
    },
    timeline: deriveTimeline(raw),
    tracking: tracking
      ? {
          company: tracking.company ?? null,
          number: tracking.number ?? null,
          url: tracking.url ?? null,
        }
      : undefined,
    statusPageUrl: raw.statusPageUrl ?? "",
    paymentStatus: humanise(raw.paymentInformation?.paymentStatus),
  };
}

export async function getOrders(cursor?: string | null): Promise<OrderPage> {
  const data = await customerGraphql<{
    customer?: {
      orders?: {
        pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
        nodes?: RawOrder[];
      } | null;
    } | null;
  }>(ORDERS_QUERY, { cursor: cursor ?? null }, "load your orders");

  const connection = data.customer?.orders;
  return {
    orders: (connection?.nodes ?? []).map(toOrder),
    cursor: connection?.pageInfo?.endCursor ?? null,
    hasNextPage: Boolean(connection?.pageInfo?.hasNextPage),
  };
}

export async function getOrder(id: string): Promise<Order | null> {
  const data = await customerGraphql<{ order?: RawOrder | null }>(
    ORDER_QUERY,
    { id },
    "load this order",
  );
  return data.order ? toOrder(data.order) : null;
}

/* ------------------------------------------------------------------ *
 * Addresses                                                           *
 * ------------------------------------------------------------------ */

function toAddress(raw: RawAddress, defaultId?: string | null): Address {
  return {
    id: raw.id,
    name: joinName(raw.firstName, raw.lastName),
    line1: raw.address1 ?? "",
    line2: raw.address2 ?? undefined,
    city: raw.city ?? "",
    state: raw.province ?? stateNameFor(raw.zoneCode ?? ""),
    zoneCode: raw.zoneCode ?? "",
    pincode: raw.zip ?? "",
    phone: raw.phoneNumber ?? "",
    isDefault: defaultId != null ? raw.id === defaultId : undefined,
  };
}

/**
 * Map the form draft onto `CustomerAddressInput`. Three things differ from the
 * shape we read back: writes take `zoneCode` (never the display `province`),
 * the country is a `territoryCode`, and the phone must be E.164 — Shopify
 * rejects the spaced "+91 91500 02116" form people naturally type.
 */
function toAddressInput(input: AddressInput): Record<string, unknown> {
  const phone = input.phone.replace(/[^\d+]/g, "");
  return {
    ...splitName(input.name),
    address1: input.line1,
    address2: input.line2 || null,
    city: input.city,
    zoneCode: input.zoneCode || stateCodeFor(input.state),
    territoryCode: "IN",
    zip: input.pincode,
    phoneNumber: phone || null,
  };
}

export async function getAddresses(): Promise<Address[]> {
  const data = await customerGraphql<{
    customer?: {
      defaultAddress?: { id: string } | null;
      addresses?: { nodes?: RawAddress[] } | null;
    } | null;
  }>(ADDRESSES_QUERY, {}, "load your addresses");

  const defaultId = data.customer?.defaultAddress?.id ?? null;
  const nodes = data.customer?.addresses?.nodes ?? [];
  /* Pass "" rather than null when there's no default, so every row gets a
     definite false. Leaving them undefined made the comparator below compute
     NaN - NaN, which leaves the sort order implementation-defined. */
  const list = nodes.map((n) => toAddress(n, defaultId ?? ""));
  /* Default first — it's the one that matters at checkout. */
  return list.sort((a, b) => Number(b.isDefault ?? false) - Number(a.isDefault ?? false));
}

/* `defaultAddress` is deliberately not sent. Shopify promotes a customer's
   first address to default on its own (verified live 2026-07-19 — an account's
   first address came back as the default without us asking), and for any later
   address the customer chooses via "Set as default". Passing an explicit false
   would read as though we intended it never to become default. */
export async function createAddress(input: AddressInput): Promise<Address> {
  const payload = await mutate<MutationPayload & { customerAddress?: RawAddress | null }>(
    ADDRESS_CREATE,
    { address: toAddressInput(input) },
    "customerAddressCreate",
    "save this address",
  );
  if (!payload.customerAddress) throw new Error("We couldn't save this address. Please try again.");
  return toAddress(payload.customerAddress);
}

export async function updateAddress(id: string, input: AddressInput): Promise<Address> {
  const payload = await mutate<MutationPayload & { customerAddress?: RawAddress | null }>(
    ADDRESS_UPDATE,
    { addressId: id, address: toAddressInput(input) },
    "customerAddressUpdate",
    "update this address",
  );
  if (!payload.customerAddress) throw new Error("We couldn't update this address. Please try again.");
  return toAddress(payload.customerAddress);
}

export async function deleteAddress(id: string): Promise<void> {
  await mutate(ADDRESS_DELETE, { addressId: id }, "customerAddressDelete", "remove this address");
}

export async function setDefaultAddress(id: string): Promise<void> {
  await mutate(
    DEFAULT_ADDRESS_UPDATE,
    { addressId: id },
    "customerDefaultAddressUpdate",
    "set your default address",
  );
}
