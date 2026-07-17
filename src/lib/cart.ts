/**
 * Public cart data layer. Picks the live Shopify Cart API when configured,
 * else the dev fixture cart. Both expose the same async surface, and both
 * return a `Cart` whose totals we display as-is (no client-side tax/shipping).
 */
import { isShopifyConfigured } from "./shopify/client";
import * as live from "./shopify/cart";
import * as fixture from "./fixtures/cart";

export const cartBackend = isShopifyConfigured ? live : fixture;
