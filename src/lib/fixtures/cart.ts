/**
 * DEV-ONLY fixture cart. Mirrors the live Shopify Cart API surface
 * (src/lib/shopify/cart.ts) so CartContext is agnostic. Lines persist to
 * localStorage. The only figure computed here is the subtotal (sum of line
 * totals) — no tax, shipping or discount is ever invented; those belong to
 * Shopify at checkout. There is no real checkout in fixture mode.
 */
import type { AddToCartInput, Cart, CartLine, Money } from "@/types";
import { DEFAULT_CURRENCY } from "../format";
import { FALLBACK_PROMO } from "@/config/launchOffer";
import { CartError } from "../shopify/cart";

const KEY = "look.cart.fixture";
const CODE_KEY = "look.cart.fixtureCode";

const read = (): CartLine[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
};

const write = (lines: CartLine[]): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable */
  }
};

const readCode = (): string | null => {
  try {
    return localStorage.getItem(CODE_KEY);
  } catch {
    return null;
  }
};

const writeCode = (code: string | null): void => {
  try {
    if (code) localStorage.setItem(CODE_KEY, code);
    else localStorage.removeItem(CODE_KEY);
  } catch {
    /* storage unavailable */
  }
};

const lineTotal = (unit: Money, qty: number): Money => ({
  amount: unit.amount * qty,
  currencyCode: unit.currencyCode,
});

const build = (lines: CartLine[]): Cart => {
  const currency = lines[0]?.unitPrice.currencyCode ?? DEFAULT_CURRENCY;
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal.amount, 0);
  const money = (amount: number): Money => ({ amount, currencyCode: currency });
  // A code only counts while there is a bag to put it on, matching the live
  // backend (Shopify marks even a valid code inapplicable on an empty cart).
  const code = lines.length ? readCode() : null;
  return {
    id: lines.length ? "fixture-cart" : null,
    checkoutUrl: null, // Shopify-hosted checkout only exists once a store is connected
    totalQuantity: lines.reduce((n, l) => n + l.quantity, 0),
    lines,
    cost: {
      subtotal: money(subtotal),
      // No discount engine here, so there is never anything taken off the lines.
      subtotalBeforeDiscount: money(subtotal),
      total: money(subtotal),
      totalTax: null,
      totalShipping: null,
    },
    discount: code ? { codes: [{ code, applicable: true }], savings: money(0) } : null,
  };
};

export async function hydrate(): Promise<Cart> {
  return build(read());
}

export async function addLine(input: AddToCartInput): Promise<Cart> {
  const lines = read();
  const existing = lines.find((l) => l.variantId === input.variantId);
  if (existing) {
    existing.quantity += input.quantity;
    existing.lineTotal = lineTotal(existing.unitPrice, existing.quantity);
  } else {
    lines.push({
      id: `fixture-line:${input.variantId}`,
      variantId: input.variantId,
      productSlug: input.productSlug,
      name: input.name,
      image: input.image,
      size: input.size,
      color: input.color,
      quantity: input.quantity,
      quantityAvailable: input.quantityAvailable,
      unitPrice: input.unitPrice,
      lineTotal: lineTotal(input.unitPrice, input.quantity),
    });
  }
  write(lines);
  return build(lines);
}

export async function updateLine(lineId: string, quantity: number): Promise<Cart> {
  let lines = read();
  if (quantity <= 0) {
    lines = lines.filter((l) => l.id !== lineId);
  } else {
    lines = lines.map((l) =>
      l.id === lineId ? { ...l, quantity, lineTotal: lineTotal(l.unitPrice, quantity) } : l,
    );
  }
  write(lines);
  return build(lines);
}

export async function removeLine(lineId: string): Promise<Cart> {
  const lines = read().filter((l) => l.id !== lineId);
  write(lines);
  return build(lines);
}

export async function clear(): Promise<Cart> {
  writeCode(null);
  write([]);
  return build([]);
}

/* Discount codes. There is no discount engine here, so the fixture validates by
   name only — the built-in campaign's code is accepted, everything else is
   rejected — and the savings it reports are ZERO. That exercises both UI paths
   (applied chip, inline "not valid") without this file inventing money it has
   no basis for, which is the same rule it already follows for tax and
   shipping. */
export async function applyDiscount(code: string): Promise<{ cart: Cart; rejected: string | null }> {
  const wanted = code.trim().toUpperCase();
  if (!wanted) throw new CartError("Enter a discount code.");
  const lines = read();
  if (!lines.length) throw new CartError("Add something to your bag before applying a code.");
  if (wanted !== FALLBACK_PROMO.code.toUpperCase()) {
    return { cart: build(lines), rejected: wanted };
  }
  writeCode(wanted);
  return { cart: build(lines), rejected: null };
}

export async function removeDiscount(): Promise<Cart> {
  writeCode(null);
  return build(read());
}

/** Mirrors the live backend's one-shot stash so the empty-bag tap behaves the
 *  same in dev. Applied on the next build() rather than at cartCreate, there
 *  being no cart to create. */
export function stashPendingCode(code: string): void {
  writeCode(code.trim().toUpperCase());
}
