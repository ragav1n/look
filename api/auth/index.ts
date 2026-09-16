/**
 * /api/auth — the two session-state endpoints, as ONE Serverless Function.
 *
 * The Hobby plan caps a deployment at 12 functions and we sat exactly on the
 * cap, so `session` and `logout` share a function to free the slot the reviews
 * endpoint needs. The URLs the SPA calls are unchanged; rewrites in vercel.json
 * map them here — the same trick as api/admin/console.ts and api/account, and
 * for the same reason: the SPA catch-all (`/(.*)` → /index.html) shadows
 * dynamic `[action].ts` routes, while a static function file plus an explicit
 * rewrite wins against it.
 *   /api/auth/session  → /api/auth?action=session
 *   /api/auth/logout   → /api/auth?action=logout
 *
 * Why THIS pair, and not one of the other candidates: both are called from
 * exactly one place in the app (src/lib/customer/bff.ts), neither is registered
 * anywhere outside this repo — unlike `auth/callback`, which IS the redirect URI
 * registered with Shopify — and they are method-disjoint, so the dispatcher's
 * fallback can't guess wrong. The newsletter pair was the tempting merge and is
 * the one to leave alone: /api/newsletter/unsubscribe already sits in delivered
 * inboxes, takes unattended RFC 8058 one-click POSTs, and a silently-broken
 * unsubscribe is a compliance failure rather than a bug.
 *
 * `login` and `callback` keep their own files. They're reached by full-page
 * navigation and browser redirect, and Vercel matches the filesystem before it
 * consults rewrites, so they are unaffected by the rewrites above.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearAuthCookies, readIdToken, setFreshLoginCookie } from "../_lib/cookies.js";
import { PROFILE_QUERY, type RawCustomer, customerGraphql, toProfile } from "../_lib/customer.js";
import { firstQuery, isSameOrigin, methodNotAllowed } from "../_lib/http.js";
import { buildLogoutUrl, idTokenExpiry } from "../_lib/oauth.js";
import { config, resolveEndpoints } from "../_lib/shopify.js";
import { getValidAccessToken } from "../_lib/tokens.js";

/** Which endpoint this is: the rewrite adds `?action=…`; if that's ever absent
 *  (a direct hit, or a Vercel change), fall back to sniffing the request path,
 *  and then to the method — only `session` answers GET and only `logout`
 *  answers POST, so there is nothing to disambiguate. */
function resolveAction(req: VercelRequest): "session" | "logout" | null {
  const q = firstQuery(req.query.action);
  if (q === "session" || q === "logout") return q;
  const url = req.url ?? "";
  if (url.includes("logout")) return "logout";
  if (url.includes("session")) return "session";
  if (req.method === "GET") return "session";
  if (req.method === "POST") return "logout";
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  switch (resolveAction(req)) {
    case "session":
      await sessionHandler(req, res);
      return;
    case "logout":
      await logoutHandler(req, res);
      return;
    default:
      res.status(404).json({ error: "not_found" });
  }
}

/**
 * GET /api/auth/session
 * How the SPA learns whether the visitor is signed in — it never sees a token,
 * only this answer. Refreshes the access token transparently if it expired.
 */
async function sessionHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
  /* Stays inside this handler: the logout response must not inherit it, and a
     shared header at the top of the dispatcher would be easy to lose track of. */
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

/**
 * POST /api/auth/logout
 * Clears the session cookies and returns Shopify's logout URL so the SPA can end
 * the hosted session too (and land back on the site origin).
 *
 * Ending the HOSTED session is the part that matters: our cookies going away
 * only signs the shopper out of this site. Shopify's own login session survives
 * independently, and while it lives, the next /api/auth/login gets SSO'd — the
 * shopper clicks "Sign in" and lands in their account without ever seeing the
 * form. The `look_fresh` marker below is the backstop for when that happens
 * anyway (see api/auth/login.ts).
 */
async function logoutHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const idToken = readIdToken(req);
  clearAuthCookies(res);
  setFreshLoginCookie(res);

  /* Shopify's logout endpoint REQUIRES a valid id_token_hint. Probed against the
     live store 2026-08-04: no hint → 400 {"error_description":"Invalid
     id_token."}, bad hint → 401. Neither ends the session, and neither redirects
     — the shopper is left staring at raw JSON on shopify.com. So we only send
     them there when we have a hint to send; with none, going straight home is
     strictly better (same surviving Shopify session, no dead end). */
  let logoutUrl = config.appOrigin;
  if (idToken) {
    /* Logged, deliberately not acted on. We never renew the id_token — Shopify's
       refresh responses don't carry one, so a long-lived session still holds the
       one minted at sign-in. Whether Shopify accepts an EXPIRED hint decides
       whether such a session can log out at all, and one real logout in the
       function logs answers it. Don't guess and skip: if expired hints are
       accepted, skipping would break the only working logout path. */
    const exp = idTokenExpiry(idToken);
    if (exp && exp < Date.now()) {
      console.warn(`[auth/logout] id_token_hint expired ${Math.round((Date.now() - exp) / 1000)}s ago`);
    }
    try {
      const endpoints = await resolveEndpoints();
      logoutUrl = buildLogoutUrl(endpoints, idToken);
    } catch {
      /* fall back to just returning to the origin */
    }
  } else {
    console.warn("[auth/logout] no id_token cookie — skipping Shopify logout");
  }
  res.status(200).json({ logoutUrl });
}
