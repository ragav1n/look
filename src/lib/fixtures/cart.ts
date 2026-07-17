/**
 * DEV-ONLY fixture cart. Mirrors the live Shopify Cart API surface
 * (src/lib/shopify/cart.ts) so CartContext is agnostic. Lines persist to
 * localStorage. The only figure computed here is the subtotal (sum of line
 * totals) — no tax, shipping or discount is ever invented; those belong to
 * Shopify at checkout. There is no real checkout in fixture mode.
 */
import type { AddToCartInput, Cart, CartLine, Money } from "@/types";
import { DEFAULT_CURRENCY } from "../format";

const KEY = "look.cart.fixture";

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

const lineTotal = (unit: Money, qty: number): Money => ({
  amount: unit.amount * qty,
  currencyCode: unit.currencyCode,
});

const build = (lines: CartLine[]): Cart => {
  const currency = lines[0]?.unitPrice.currencyCode ?? DEFAULT_CURRENCY;
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal.amount, 0);
  const money = (amount: number): Money => ({ amount, currencyCode: currency });
  return {
    id: lines.length ? "fixture-cart" : null,
    checkoutUrl: null, // Shopify-hosted checkout only exists once a store is connected
    totalQuantity: lines.reduce((n, l) => n + l.quantity, 0),
    lines,
    cost: {
      subtotal: money(subtotal),
      total: money(subtotal),
      totalTax: null,
      totalShipping: null,
    },
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
  write([]);
  return build([]);
}
