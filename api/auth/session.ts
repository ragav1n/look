/**
 * GET /api/auth/session
 * How the SPA learns whether the visitor is signed in — it never sees a token,
 * only this answer. Refreshes the access token transparently if it expired.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PROFILE_QUERY, type RawCustomer, customerGraphql, toProfile } from "../_lib/customer.js";
import { getValidAccessToken } from "../_lib/tokens.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store");

  const token = await getValidAccessToken(req, res);
  if (!token) {
    res.status(200).json({ authenticated: false });
    return;
  }

  try {
    const gql = await customerGraphql(token, { query: PROFILE_QUERY });
    const json = (await gql.json()) as { data?: { customer?: RawCustomer | null } };
    const customer = json.data?.customer;
    if (!customer) {
      res.status(200).json({ authenticated: false });
      return;
    }
    res.status(200).json({ authenticated: true, profile: toProfile(customer) });
  } catch {
    res.status(200).json({ authenticated: false });
  }
}
