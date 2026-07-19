/**
 * POST /api/customer/graphql
 * The one pipe the SPA uses to read/write customer data (profile now; orders +
 * addresses in Phase 2). Injects the access token server-side and forwards to
 * Shopify. The customer token is inherently scoped to that one customer, so
 * forwarding arbitrary customer-scoped operations is safe.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { customerGraphql } from "../_lib/customer.js";
import { isSameOrigin, methodNotAllowed } from "../_lib/http.js";
import { getValidAccessToken } from "../_lib/tokens.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const query = req.body?.query;
  if (typeof query !== "string") {
    res.status(400).json({ error: "missing_query" });
    return;
  }

  const token = await getValidAccessToken(req, res);
  if (!token) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  try {
    const gql = await customerGraphql(token, { query, variables: req.body?.variables });
    res.status(gql.status).json(await gql.json());
  } catch {
    res.status(502).json({ error: "upstream_error" });
  }
}
