/**
 * Live customer auth — talks ONLY to the same-origin /api BFF, never to Shopify
 * directly and never to a token. The browser holds no credentials: httpOnly
 * cookies ride along automatically with `credentials: "include"`.
 */
import type { UserProfile } from "@/types";
import type { Session } from "./types";

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

interface UpdateResult {
  data?: {
    customerUpdate?: {
      customer?: {
        firstName?: string | null;
        lastName?: string | null;
        emailAddress?: { emailAddress?: string | null } | null;
        phoneNumber?: { phoneNumber?: string | null } | null;
      } | null;
      userErrors?: { message: string }[];
    };
  };
  /** Top-level GraphQL errors (bad query shape, missing scope) — distinct from
   *  userErrors, which are per-field validation failures. */
  errors?: { message: string }[];
  /** The BFF's own error envelope, e.g. `{error:"unauthenticated"}` on a 401. */
  error?: string;
}

export async function updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
  const input: Record<string, string> = {};
  if (patch.name != null) {
    const [first, ...rest] = patch.name.trim().split(/\s+/);
    input.firstName = first ?? "";
    input.lastName = rest.join(" ");
  }

  const res = await api("/api/customer/graphql", jsonInit({ query: CUSTOMER_UPDATE, variables: { input } }));
  const json = (await res.json().catch(() => ({}))) as UpdateResult;

  if (res.status === 401) throw new Error("Your session expired. Please sign in again.");

  const errs = json.data?.customerUpdate?.userErrors;
  if (errs?.length) throw new Error(errs.map((e) => e.message).join("; "));

  const c = json.data?.customerUpdate?.customer;
  if (!c) {
    /* Surface what actually went wrong rather than a blanket retry message —
       a rejected mutation shape or a missing write scope is otherwise invisible. */
    const detail = json.errors?.map((e) => e.message).join("; ") || json.error;
    throw new Error(
      detail ? `We couldn't save your profile: ${detail}` : "We couldn't save your profile. Please try again.",
    );
  }
  return {
    name: [c.firstName, c.lastName].filter(Boolean).join(" "),
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
