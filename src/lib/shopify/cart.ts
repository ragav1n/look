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

const takePendingCode = (): string | null => {
  try {
    const code = localStorage.getItem(PENDING_CODE_KEY);
    // One shot, whatever the verdict: a code Shopify won't honour must not sit
    // in storage re-attaching itself to every cart the shopper ever starts.
    localStorage.removeItem(PENDING_CODE_KEY);
    return code;
  } catch {
    return null;
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

/** Create a fresh cart seeded with `line`, replacing whatever id we held. Any
 *  code stashed from a promo surface is claimed here, in the same request. */
async function createWith(line: { merchandiseId: string; quantity: number }): Promise<Cart> {
  const pending = takePendingCode();
  const data = await storefront<{
    cartCreate: { cart: SFCart | null; userErrors?: { message: string }[] };
  }>(CART_CREATE_MUTATION, { lines: [line], discountCodes: pending ? [pending] : null });
  const cart = data.cartCreate.cart;
  if (!cart) throw new Error(firstUserError(data.cartCreate.userErrors) ?? "Could not create cart.");
  writeId(cart.id);
  /* The stashed code may no longer be honourable by the time the bag exists
     (expired, or this item doesn't qualify). Strip it rather than leave a dead
     code sitting on the cart the shopper is about to look at. */
  if (pending && cart.discountCodes.some((d) => !d.applicable)) {
    const cleaned = await setCodes(cart.id, applicableCodes(cart));
    return toCart(cleaned);
  }
  return withNotice(cart, data.cartCreate.userErrors);
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
  return withNotice(cart, data.cartLinesAdd.userErrors);
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
