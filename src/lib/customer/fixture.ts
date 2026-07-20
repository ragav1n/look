/**
 * DEV customer auth — no backend, no Shopify. Keeps the account UI navigable
 * under plain `vite` (VITE_CUSTOMER_AUTH_ENABLED unset). It deliberately mirrors
 * the real flow's full-page redirect so the same mount-time session check runs
 * on return, exercising the whole SPA path with zero infrastructure.
 */
import type { Address, AddressInput, Order, UserProfile } from "@/types";
import { addresses as seedAddresses, orders } from "@/lib/fixtures/account";
import type { OrderPage, Session } from "./types";

const USER_KEY = "look.user";
const FLAG_KEY = "look.fixtureAuth";

/** Reuses the "Sushmitha R" persona the account fixtures are built around. */
const PERSONA: UserProfile = {
  name: "Sushmitha R",
  email: "sushmitha@look.in",
  phone: "+91 9150002116",
};

function readUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function writeUser(user: UserProfile | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable */
  }
}

const isSignedIn = () => {
  try {
    return localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
};

export async function getSession(): Promise<Session> {
  if (!isSignedIn()) return { authenticated: false, profile: null };
  const user = readUser() ?? PERSONA;
  writeUser(user);
  return { authenticated: true, profile: user };
}

export function beginLogin(from?: string): void {
  try {
    localStorage.setItem(FLAG_KEY, "1");
  } catch {
    /* storage unavailable */
  }
  if (!readUser()) writeUser(PERSONA);
  window.location.assign(from && from.startsWith("/") ? from : "/account/profile");
}

export async function logout(): Promise<void> {
  try {
    localStorage.removeItem(FLAG_KEY);
  } catch {
    /* storage unavailable */
  }
  writeUser(null);
}

export async function updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
  const next = { ...(readUser() ?? PERSONA), ...patch };
  writeUser(next);
  return next;
}

export async function notifyAccountWelcome(): Promise<void> {
  /* no email backend in fixture mode */
}

export async function linkCart(): Promise<void> {
  /* no cart backend in fixture mode */
}

export async function unlinkCart(): Promise<void> {
  /* no cart backend in fixture mode */
}

/* ------------------------------------------------------------------ *
 * Orders — read-only; nothing in the app creates one.                 *
 * ------------------------------------------------------------------ */

/** The whole fixture set fits in one page, so the cursor is always exhausted.
 *  The shape still matches the live one so the "Load more" path stays typed. */
export async function getOrders(): Promise<OrderPage> {
  return { orders, cursor: null, hasNextPage: false };
}

export async function getOrder(id: string): Promise<Order | null> {
  return orders.find((o) => o.id === id) ?? null;
}

/* ------------------------------------------------------------------ *
 * Addresses — persisted, so an address added in dev survives a reload *
 * exactly as the live one survives on Shopify.                        *
 * ------------------------------------------------------------------ */

const ADDRESS_KEY = "look.addresses";

function readAddresses(): Address[] {
  try {
    const raw = localStorage.getItem(ADDRESS_KEY);
    if (!raw) return seedAddresses;
    const parsed = JSON.parse(raw) as Address[];
    return Array.isArray(parsed) ? parsed : seedAddresses;
  } catch {
    return seedAddresses;
  }
}

function writeAddresses(list: Address[]): Address[] {
  try {
    localStorage.setItem(ADDRESS_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
  return list;
}

export async function getAddresses(): Promise<Address[]> {
  return [...readAddresses()].sort(
    (a, b) => Number(b.isDefault ?? false) - Number(a.isDefault ?? false),
  );
}

export async function createAddress(input: AddressInput): Promise<Address> {
  const list = readAddresses();
  const created: Address = {
    ...input,
    id: `gid://shopify/CustomerAddress/${Date.now()}`,
    isDefault: list.length === 0,
  };
  writeAddresses([...list, created]);
  return created;
}

export async function updateAddress(id: string, input: AddressInput): Promise<Address> {
  const list = readAddresses();
  const existing = list.find((a) => a.id === id);
  if (!existing) throw new Error("We couldn't find that address.");
  const next: Address = { ...existing, ...input };
  writeAddresses(list.map((a) => (a.id === id ? next : a)));
  return next;
}

export async function deleteAddress(id: string): Promise<void> {
  const list = readAddresses().filter((a) => a.id !== id);
  /* Losing the default would leave checkout with nothing preselected, so the
     first survivor inherits it — Shopify does the same. */
  if (list.length > 0 && !list.some((a) => a.isDefault)) list[0].isDefault = true;
  writeAddresses(list);
}

export async function setDefaultAddress(id: string): Promise<void> {
  writeAddresses(readAddresses().map((a) => ({ ...a, isDefault: a.id === id })));
}
