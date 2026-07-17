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

export async function hydrate(): Promise<Cart> {
  const id = readId();
  if (!id) return emptyCart();
  try {
    const data = await storefront<{ cart: SFCart | null }>(CART_QUERY, { id });
    if (!data.cart) {
      writeId(null);
      return emptyCart();
    }
    return toCart(data.cart);
  } catch {
    writeId(null);
    return emptyCart();
  }
}

export async function addLine(input: AddToCartInput): Promise<Cart> {
  const line = { merchandiseId: input.variantId, quantity: input.quantity };
  const id = readId();
  if (!id) {
    const data = await storefront<{ cartCreate: { cart: SFCart | null } }>(CART_CREATE_MUTATION, {
      lines: [line],
    });
    const cart = data.cartCreate.cart;
    if (!cart) throw new Error("Could not create cart.");
    writeId(cart.id);
    return toCart(cart);
  }
  const data = await storefront<{ cartLinesAdd: { cart: SFCart | null } }>(CART_LINES_ADD_MUTATION, {
    cartId: id,
    lines: [line],
  });
  const cart = data.cartLinesAdd.cart;
  if (!cart) throw new Error("Could not add to cart.");
  return toCart(cart);
}

export async function updateLine(lineId: string, quantity: number): Promise<Cart> {
  const id = readId();
  if (!id) return emptyCart();
  if (quantity <= 0) return removeLine(lineId);
  const data = await storefront<{ cartLinesUpdate: { cart: SFCart | null } }>(
    CART_LINES_UPDATE_MUTATION,
    { cartId: id, lines: [{ id: lineId, quantity }] },
  );
  const cart = data.cartLinesUpdate.cart;
  if (!cart) throw new Error("Could not update cart.");
  return toCart(cart);
}

export async function removeLine(lineId: string): Promise<Cart> {
  const id = readId();
  if (!id) return emptyCart();
  const data = await storefront<{ cartLinesRemove: { cart: SFCart | null } }>(
    CART_LINES_REMOVE_MUTATION,
    { cartId: id, lineIds: [lineId] },
  );
  const cart = data.cartLinesRemove.cart;
  if (!cart) throw new Error("Could not remove from cart.");
  return toCart(cart);
}

export async function clear(): Promise<Cart> {
  writeId(null);
  return emptyCart();
}
