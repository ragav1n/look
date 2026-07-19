import type { UserProfile } from "@/types";

export interface Session {
  authenticated: boolean;
  profile: UserProfile | null;
}

/** The customer-auth surface. `bff` (live, via the /api BFF) and `fixture`
 *  (dev, no backend) both implement it; `index.ts` picks one. */
export interface CustomerAuth {
  getSession(): Promise<Session>;
  /** Starts login — ends in a full-page redirect, so it returns void. */
  beginLogin(from?: string): void;
  logout(): Promise<void>;
  updateProfile(patch: Partial<UserProfile>): Promise<UserProfile>;
  linkCart(cartId: string): Promise<void>;
  unlinkCart(cartId: string): Promise<void>;
}
