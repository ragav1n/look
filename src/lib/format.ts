import type { Money } from "@/types";

export const DEFAULT_CURRENCY = "INR";

/** Format a price for display. The Figma design uses the "Rs." prefix, so INR
 *  gets that treatment; any other currency falls back to Intl currency format.
 *  This only *displays* Shopify's returned amounts — it computes nothing. */
export function formatPrice(amount: number, currency: string = DEFAULT_CURRENCY): string {
  if (currency === "INR") return `Rs. ${Math.round(amount).toLocaleString("en-IN")}`;
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

export const formatMoney = (m: Money): string => formatPrice(m.amount, m.currencyCode);
