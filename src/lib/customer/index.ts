/**
 * Public customer-auth data layer. Components/contexts import *only* from here.
 * Mirrors the catalog/cart convention: when VITE_CUSTOMER_AUTH_ENABLED is "true"
 * (prod, or `vercel dev`) the live BFF backs it; otherwise the dev fixture does,
 * so the account UI works with no backend and no Shopify.
 */
import * as bff from "./bff";
import * as fixture from "./fixture";
import type { CustomerAuth } from "./types";

export const customerAuthEnabled = import.meta.env.VITE_CUSTOMER_AUTH_ENABLED === "true";

const impl: CustomerAuth = customerAuthEnabled ? bff : fixture;

export const getSession = impl.getSession;
export const beginLogin = impl.beginLogin;
export const logout = impl.logout;
export const updateProfile = impl.updateProfile;
export const linkCart = impl.linkCart;
export const unlinkCart = impl.unlinkCart;

export type { Session } from "./types";
