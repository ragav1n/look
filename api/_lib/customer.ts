/** Thin wrapper over the Customer Account GraphQL API. The access token is sent
 *  as `Authorization: <token>` — no `Bearer` prefix (Shopify's convention). */
import { resolveEndpoints } from "./shopify.js";

export interface GraphQLBody {
  query: string;
  variables?: Record<string, unknown>;
}

export async function customerGraphql(accessToken: string, body: GraphQLBody): Promise<Response> {
  const endpoints = await resolveEndpoints();
  return fetch(endpoints.graphql, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: accessToken,
    },
    body: JSON.stringify(body),
  });
}

export const PROFILE_QUERY = /* GraphQL */ `
  query CustomerProfile {
    customer {
      firstName
      lastName
      emailAddress { emailAddress }
      phoneNumber { phoneNumber }
    }
  }
`;

/** Just enough to greet someone and find them in the Admin API. Taking the id
 *  straight off the token sidesteps the ~30–60s lag in Shopify's customer
 *  search index, which makes an email lookup useless right after signup — the
 *  exact moment the account welcome needs to run. */
export const IDENTITY_QUERY = /* GraphQL */ `
  query CustomerIdentity {
    customer {
      id
      firstName
      emailAddress { emailAddress }
    }
  }
`;

export interface RawIdentity {
  id?: string | null;
  firstName?: string | null;
  emailAddress?: { emailAddress?: string | null } | null;
}

/**
 * Normalise a Customer Account API id into the GID the Admin API expects.
 * The two APIs agree on the numeric id but not always on the wrapper — ids can
 * arrive bare, or with a `?key=` suffix — so we rebuild from the digits rather
 * than trusting the string through.
 */
export function toAdminCustomerGid(raw: string): string | null {
  const numeric = raw.split("?")[0].split("/").pop() ?? "";
  if (!/^\d+$/.test(numeric)) return null;
  return `gid://shopify/Customer/${numeric}`;
}

export interface RawCustomer {
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: { emailAddress?: string | null } | null;
  phoneNumber?: { phoneNumber?: string | null } | null;
}

/** Map the Customer Account API shape to the app's {name,email,phone} profile. */
export function toProfile(c: RawCustomer): { name: string; email: string; phone: string } {
  return {
    name: [c.firstName, c.lastName].filter(Boolean).join(" "),
    email: c.emailAddress?.emailAddress ?? "",
    phone: c.phoneNumber?.phoneNumber ?? "",
  };
}
