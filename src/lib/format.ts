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

/** Rounded % off when there's a genuine markdown (mrp strictly above price),
 *  else 0. Callers gate display on the result being > 0, which also absorbs
 *  thin markdowns that round down to 0%. */
export function discountPercent(price: number, mrp?: number): number {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/** Space out a stored phone number for display. Shopify holds numbers in E.164
 *  ("+919150002116"), which is correct to send and unreadable to look at.
 *  Anything that isn't a recognisable Indian mobile is returned untouched
 *  rather than mis-grouped. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  const match = /^\+91(\d{10})$/.exec(digits);
  if (!match) return phone;
  const local = match[1];
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}
