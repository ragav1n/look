/**
 * POST /api/cart/link   body: { cartId, unlink? }
 * Attaches (or clears) the signed-in customer on a Storefront cart so Shopify's
 * hosted checkout recognises them. Uses the public Storefront token for the
 * mutation and the server-held customer token as the buyer identity — the token
 * never reaches the browser. Best-effort: the SPA never blocks checkout on it.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PROFILE_QUERY, customerGraphql, toProfile } from "../_lib/customer.js";
import { isSameOrigin, methodNotAllowed } from "../_lib/http.js";
import { config, storefrontGraphqlUrl } from "../_lib/shopify.js";
import { getValidAccessToken } from "../_lib/tokens.js";

const CART_BUYER_IDENTITY_UPDATE = /* GraphQL */ `
  mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart { id }
      userErrors { message }
    }
  }
`;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const cartId = req.body?.cartId;
  const unlink = Boolean(req.body?.unlink);
  if (typeof cartId !== "string" || !cartId) {
    res.status(400).json({ error: "missing_cartId" });
    return;
  }
  if (!config.storefrontToken) {
    res.status(500).json({ error: "storefront_token_missing" });
    return;
  }

  let buyerIdentity: Record<string, unknown>;
  if (unlink) {
    buyerIdentity = { customerAccessToken: null };
  } else {
    const token = await getValidAccessToken(req, res);
    if (!token) {
      res.status(401).json({ error: "unauthenticated" });
      return;
    }
    // Send email too so checkout is still linked if this token type isn't
    // accepted as a customerAccessToken on the store's Storefront API version.
    let email: string | undefined;
    try {
      const p = await customerGraphql(token, { query: PROFILE_QUERY });
      const j = (await p.json()) as { data?: { customer?: Parameters<typeof toProfile>[0] | null } };
      if (j.data?.customer) email = toProfile(j.data.customer).email || undefined;
    } catch {
      /* email is a bonus; proceed with the token alone */
    }
    buyerIdentity = { customerAccessToken: token, ...(email ? { email } : {}) };
  }

  try {
    const gql = await fetch(storefrontGraphqlUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": config.storefrontToken,
      },
      body: JSON.stringify({ query: CART_BUYER_IDENTITY_UPDATE, variables: { cartId, buyerIdentity } }),
    });
    const json = (await gql.json()) as {
      data?: { cartBuyerIdentityUpdate?: { userErrors?: { message: string }[] } };
    };
    const userErrors = json.data?.cartBuyerIdentityUpdate?.userErrors ?? [];
    res.status(200).json({ ok: userErrors.length === 0, userErrors });
  } catch {
    res.status(502).json({ error: "upstream_error" });
  }
}
