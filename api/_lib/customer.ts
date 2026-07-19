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
