import type { Address, AddressInput, Order, UserProfile } from "@/types";

export interface Session {
  authenticated: boolean;
  profile: UserProfile | null;
}

/** One page of orders, with the cursor needed to ask for the next. Orders are
 *  paged rather than capped so a long history can't be silently truncated. */
export interface OrderPage {
  orders: Order[];
  cursor: string | null;
  hasNextPage: boolean;
}

/** The customer-auth and customer-data surface. `bff` (live, via the /api BFF)
 *  and `fixture` (dev, no backend) both implement it; `index.ts` picks one.
 *
 *  Reads throw on failure — matching the Storefront convention, so `useAsyncData`
 *  can surface a real error state. The one deliberate exception is `getSession`,
 *  which swallows and degrades to signed-out. */
export interface CustomerAuth {
  getSession(): Promise<Session>;
  /** Starts login — ends in a full-page redirect, so it returns void. */
  beginLogin(from?: string): void;
  logout(): Promise<void>;
  updateProfile(patch: Partial<UserProfile>): Promise<UserProfile>;
  /** Ask the backend to send the first-sign-in welcome email. Idempotent on the
   *  server, so calling it more than once is harmless. Best-effort — never
   *  throws, since a missing welcome must not disrupt the session. */
  notifyAccountWelcome(): Promise<void>;
  linkCart(cartId: string): Promise<void>;
  unlinkCart(cartId: string): Promise<void>;

  /** `cursor` continues a previous page; omit it for the first. */
  getOrders(cursor?: string | null): Promise<OrderPage>;
  /** Null when no such order belongs to this customer — distinct from a
   *  throw, which means the request itself failed. */
  getOrder(id: string): Promise<Order | null>;

  getAddresses(): Promise<Address[]>;
  createAddress(input: AddressInput): Promise<Address>;
  updateAddress(id: string, input: AddressInput): Promise<Address>;
  deleteAddress(id: string): Promise<void>;
  setDefaultAddress(id: string): Promise<void>;
}
