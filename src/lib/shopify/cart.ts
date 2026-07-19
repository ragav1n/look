import type { AddToCartInput, Cart } from "@/types";
import { storefront } from "./client";
import {
  CART_CREATE_MUTATION,
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
