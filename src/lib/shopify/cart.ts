import type { AddToCartInput, Cart } from "@/types";
import { storefront } from "./client";
import {
  CART_CREATE_MUTATION,
  CART_DISCOUNT_CODES_UPDATE_MUTATION,
  CART_LINES_ADD_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  CART_QUERY,
} from "./queries";
import { emptyCart, toCart } from "./transform";
import type { SFCart } from "./types";

/** Live Shopify Cart API. The cart lives on Shopify; we persist only its id and
 *  read every total/price straight from the API. Checkout hands off to the
 *  Shopify-hosted `checkoutUrl`. */

const CART_ID_KEY = "look.cartId";
/** A code tapped from a promo surface before there was a cart to put it on. It
 *  waits here and rides along on the cartCreate that the first add-to-cart has
 *  to make anyway, so the one-tap promise costs no extra request. */
const PENDING_CODE_KEY = "look.promoCode";

const readId = (): string | null => {
  try {
    return localStorage.getItem(CART_ID_KEY);
  } catch {
    return null;
  }
};

const writeId = (id: string | null): void => {
  try {
    if (id) localStorage.setItem(CART_ID_KEY, id);
    else localStorage.removeItem(CART_ID_KEY);
  } catch {
    /* storage unavailable */
  }
};

export const stashPendingCode = (code: string): void => {
  try {
    localStorage.setItem(PENDING_CODE_KEY, code);
  } catch {
    /* storage unavailable — the shopper can still type the code in the cart */
  }
};

const peekPendingCode = (): string | null => {
  try {
    return localStorage.getItem(PENDING_CODE_KEY);
  } catch {
    return null;
  }
};

/* One shot, but only once Shopify has actually answered: a code Shopify won't
   honour must not sit in storage re-attaching itself to every cart the shopper
   ever starts, and a code we promised to remember must not vanish because the
   request that would have claimed it never landed. */
const clearPendingCode = (): void => {
  try {
    localStorage.removeItem(PENDING_CODE_KEY);
  } catch {
    /* storage unavailable */
  }
};

/* Shopify reports recoverable problems (a line clamped to available stock, say)
   in `userErrors` alongside a perfectly good cart. The cart is still the truth,
   so the message rides along on it rather than being thrown — throwing would
   discard the very update the user just made. */
const firstUserError = (errors?: { message: string }[]): string | undefined =>
  errors?.find((e) => e.message)?.message;

const withNotice = (cart: SFCart, errors?: { message: string }[]): Cart => {
  const notice = firstUserError(errors);
  return notice ? { ...toCart(cart), notice } : toCart(cart);
};

/* Shopify carts expire (~10 days idle) and are consumed by checkout. A cart id
   that resolves to `null` is genuinely dead, so we drop it and start over.
   A THROWN error is a different thing entirely — offline, DNS, 5xx, rate
   limiting — and must never delete the id, or a brief blip permanently orphans
   a cart the customer can still see on Shopify. */
const discardDeadCart = (): void => writeId(null);

/** An error whose message is written for the customer. Everything else that
 *  escapes this module is technical (HTTP status, GraphQL payload) and callers
 *  should show their own wording instead. */
export class CartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartError";
  }
}

export async function hydrate(): Promise<Cart> {
  const id = readId();
  if (!id) return emptyCart();
  const data = await storefront<{ cart: SFCart | null }>(CART_QUERY, { id });
  if (!data.cart) {
    discardDeadCart();
    return emptyCart();
  }
  return toCart(data.cart);
}

/** Create a fresh cart seeded with `line`, replacing whatever id we held. */
async function createWith(line: { merchandiseId: string; quantity: number }): Promise<Cart> {
  const data = await storefront<{
    cartCreate: { cart: SFCart | null; userErrors?: { message: string }[] };
  }>(CART_CREATE_MUTATION, { lines: [line] });
  const cart = data.cartCreate.cart;
  if (!cart) throw new Error(firstUserError(data.cartCreate.userErrors) ?? "Could not create cart.");
  writeId(cart.id);
  return claimPendingCode(cart, data.cartCreate.userErrors);
}

export async function addLine(input: AddToCartInput): Promise<Cart> {
  const line = { merchandiseId: input.variantId, quantity: input.quantity };
  const id = readId();
  if (!id) return createWith(line);

  const data = await storefront<{
    cartLinesAdd: { cart: SFCart | null; userErrors?: { message: string }[] };
  }>(CART_LINES_ADD_MUTATION, { cartId: id, lines: [line] });
  const cart = data.cartLinesAdd.cart;
  /* The stored cart is dead (expired, or already checked out in another tab).
     Drop it and start a new one rather than failing every add from here on. */
  if (!cart) {
    discardDeadCart();
    return createWith(line);
  }
  return claimPendingCode(cart, data.cartLinesAdd.userErrors);
}

export async function updateLine(lineId: string, quantity: number): Promise<Cart> {
  const id = readId();
  if (!id) return emptyCart();
  if (quantity <= 0) return removeLine(lineId);
  const data = await storefront<{
    cartLinesUpdate: { cart: SFCart | null; userErrors?: { message: string }[] };
  }>(CART_LINES_UPDATE_MUTATION, { cartId: id, lines: [{ id: lineId, quantity }] });
  const cart = data.cartLinesUpdate.cart;
  if (!cart) {
    discardDeadCart();
    throw new CartError("Your cart expired. Refresh the page to start a new one.");
  }
  return withNotice(cart, data.cartLinesUpdate.userErrors);
}

export async function removeLine(lineId: string): Promise<Cart> {
  const id = readId();
  if (!id) return emptyCart();
  const data = await storefront<{
    cartLinesRemove: { cart: SFCart | null; userErrors?: { message: string }[] };
  }>(CART_LINES_REMOVE_MUTATION, { cartId: id, lineIds: [lineId] });
  const cart = data.cartLinesRemove.cart;
  if (!cart) {
    discardDeadCart();
    throw new CartError("Your cart expired. Refresh the page to start a new one.");
  }
  return withNotice(cart, data.cartLinesRemove.userErrors);
}

/* ---------------------------------------------------------------- *
 * Discount codes                                                     *
 * ---------------------------------------------------------------- */

const applicableCodes = (cart: SFCart): string[] =>
  cart.discountCodes.filter((d) => d.applicable).map((d) => d.code);

/** Set the cart's codes, replacing whatever was there. Shared by apply, remove
 *  and the stashed-code cleanup so they all handle a dead cart the same way. */
async function setCodes(cartId: string, codes: string[]): Promise<SFCart> {
  const data = await storefront<{
    cartDiscountCodesUpdate: { cart: SFCart | null; userErrors?: { message: string }[] };
  }>(CART_DISCOUNT_CODES_UPDATE_MUTATION, { cartId, discountCodes: codes });
  const cart = data.cartDiscountCodesUpdate.cart;
  if (!cart) {
    discardDeadCart();
    throw new CartError("Your cart expired. Refresh the page to start a new one.");
  }
  return cart;
}

/** Put a stashed promo code onto a cart that now has something in it.
 *
 *  Runs after BOTH ways a line can land — a fresh cartCreate, and a
 *  cartLinesAdd onto a cart that already existed. That second case is not
 *  hypothetical: emptying a bag item by item leaves the cart id in place, so a
 *  shopper in exactly that state would take a promo chip, get told the code was
 *  saved, add something, and never see it applied.
 *
 *  A cart with no lines is left alone: Shopify marks even a valid code
 *  inapplicable on an empty cart, so claiming it there would burn the code on a
 *  guaranteed rejection. */
async function claimPendingCode(cart: SFCart, errors?: { message: string }[]): Promise<Cart> {
  const pending = peekPendingCode();
  if (!pending || cart.totalQuantity === 0) return withNotice(cart, errors);

  let settled: SFCart;
  try {
    settled = await setCodes(cart.id, [pending]);
  } catch {
    /* The line IS in the bag, and that is what the shopper asked for. Keep the
       code stashed for the next attempt rather than failing the whole add. */
    return withNotice(cart, errors);
  }
  clearPendingCode();

  // Same rule as applyDiscount: never leave a code Shopify won't honour.
  if (settled.discountCodes.some((d) => !d.applicable)) {
    return withNotice(await setCodes(cart.id, applicableCodes(settled)), errors);
  }
  return withNotice(settled, errors);
}

/** Outcome of a code attempt. `rejected` is the code Shopify took onto the cart
 *  and then marked applicable:false — unknown, expired, customer-specific, or
 *  an eligible code whose minimum this bag doesn't meet. Shopify reports all of
 *  those as a SUCCESSFUL mutation with an empty userErrors (verified against the
 *  live store), so `applicable` is the only signal there is, and there is no way
 *  to tell the four apart. */
export interface DiscountResult {
  cart: Cart;
  rejected: string | null;
}

export async function applyDiscount(code: string): Promise<DiscountResult> {
  const wanted = code.trim();
  if (!wanted) throw new CartError("Enter a discount code.");
  const id = readId();
  /* Shopify marks even a perfectly good code inapplicable on an empty cart, so
     there is nothing useful to do here — and nothing to apply it to. */
  if (!id) throw new CartError("Add something to your bag before applying a code.");

  const cart = await setCodes(id, [wanted]);
  const verdict = cart.discountCodes.find((d) => d.code.toLowerCase() === wanted.toLowerCase());
  if (verdict && !verdict.applicable) {
    /* Roll it straight back off. Left on, it would either park a permanent
       "not applied" row the shopper reads as a bug, or ride into Shopify's
       hosted checkout looking half-applied. The caller shows one inline
       message instead. */
    const reverted = await setCodes(id, applicableCodes(cart));
    return { cart: toCart(reverted), rejected: wanted };
  }
  return { cart: toCart(cart), rejected: null };
}

export async function removeDiscount(): Promise<Cart> {
  const id = readId();
  if (!id) return emptyCart();
  return toCart(await setCodes(id, []));
}

/** Empty the cart on Shopify too, so an explicitly-cleared cart can't linger
 *  and trigger abandoned-cart automations. */
export async function clear(): Promise<Cart> {
  const id = readId();
  if (!id) return emptyCart();
  try {
    const data = await storefront<{ cart: SFCart | null }>(CART_QUERY, { id });
    const lineIds = data.cart?.lines.nodes.map((l) => l.id) ?? [];
    if (lineIds.length) {
      await storefront<{ cartLinesRemove: { cart: SFCart | null } }>(CART_LINES_REMOVE_MUTATION, {
        cartId: id,
        lineIds,
      });
    }
  } catch {
    /* Best effort. The local cart is cleared either way — a lingering remote
       cart is far less bad than blocking the user from emptying theirs. */
  }
  writeId(null);
  return emptyCart();
}
