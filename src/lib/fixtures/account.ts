/**
 * DEV-ONLY account fixtures. Orders and addresses live in Shopify's Customer
 * Account API and the wallet in a loyalty app — not in this repo. These back
 * the account UI under plain `npm run dev`, where there is no BFF to talk to.
 *
 * They are shaped exactly like the live mappers' output (Money rather than bare
 * numbers, GID-style ids, an OrderStep timeline) so both backends render
 * through the same code paths and a fixture-only bug can't hide a live one.
 */
import type { Address, Order, WalletTransaction } from "@/types";
import pdpMain from "@/assets/pdp-main-24.jpg";
import product22 from "@/assets/product-22.jpg";
import product23 from "@/assets/product-23.jpg";

const inr = (amount: number) => ({ amount, currencyCode: "INR" });

export const addresses: Address[] = [
  {
    id: "gid://shopify/CustomerAddress/1",
    name: "Sushmitha R",
    line1: "12, Lotus Residency, MG Road",
    line2: "Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    zoneCode: "KA",
    pincode: "560038",
    phone: "+919150002116",
    isDefault: true,
  },
  {
    id: "gid://shopify/CustomerAddress/2",
    name: "Sushmitha R",
    line1: "4th Floor, Prestige Tech Park",
    line2: "Kadubeesanahalli",
    city: "Bengaluru",
    state: "Karnataka",
    zoneCode: "KA",
    pincode: "560103",
    phone: "+919150002116",
    isDefault: false,
  },
];

export const orders: Order[] = [
  {
    id: "gid://shopify/Order/24817",
    number: "#24817",
    reference: "24817",
    placedAt: "2026-07-08T10:24:00Z",
    status: "shipped",
    items: [
      {
        productId: "gid://shopify/Product/1",
        variantId: "gid://shopify/ProductVariant/1",
        productSlug: "red-kurta-set",
        name: "Red Kurta Set",
        image: pdpMain,
        size: "M",
        color: "Red",
        quantity: 1,
        price: inr(600),
      },
      {
        productId: "gid://shopify/Product/2",
        variantId: "gid://shopify/ProductVariant/2",
        productSlug: "mustard-anarkali",
        name: "Mustard Anarkali",
        image: product22,
        size: "L",
        color: "Mustard",
        quantity: 1,
        price: inr(670),
      },
    ],
    address: addresses[0],
    totals: {
      subtotal: inr(1270),
      shipping: inr(0),
      taxes: inr(64),
      total: inr(1334),
    },
    timeline: [
      { status: "ordered", reached: true, at: "2026-07-08T10:24:00Z" },
      { status: "shipped", reached: true, at: "2026-07-09T16:10:00Z" },
      { status: "out_for_delivery", reached: false, at: null },
      { status: "delivered", reached: false, at: null },
    ],
    tracking: {
      company: "Delhivery",
      number: "DL7729184455",
      url: "https://www.delhivery.com/track/package/DL7729184455",
    },
    statusPageUrl: "https://look-10300.myshopify.com/account/orders/24817",
    paymentStatus: "Paid",
  },
  {
    id: "gid://shopify/Order/24390",
    number: "#24390",
    reference: "24390",
    placedAt: "2026-06-21T12:00:00Z",
    status: "delivered",
    items: [
      {
        productId: "gid://shopify/Product/3",
        variantId: "gid://shopify/ProductVariant/3",
        productSlug: "ivory-coord-set",
        name: "Ivory Coord Set",
        image: product23,
        size: "S",
        color: "Cream",
        quantity: 1,
        price: inr(650),
      },
    ],
    address: addresses[0],
    totals: {
      subtotal: inr(650),
      shipping: inr(49),
      taxes: inr(33),
      total: inr(732),
    },
    timeline: [
      { status: "ordered", reached: true, at: "2026-06-21T12:00:00Z" },
      { status: "shipped", reached: true, at: "2026-06-22T09:00:00Z" },
      { status: "out_for_delivery", reached: true, at: null },
      { status: "delivered", reached: true, at: "2026-06-24T17:45:00Z" },
    ],
    tracking: {
      company: "Bluedart",
      number: "BD5591027733",
      url: "https://www.bluedart.com/tracking/BD5591027733",
    },
    statusPageUrl: "https://look-10300.myshopify.com/account/orders/24390",
    paymentStatus: "Paid",
  },
];

export const walletBalance = 450;
export const walletPoints = 320;

export const walletTransactions: WalletTransaction[] = [
  {
    id: "wtx-1",
    date: "2026-07-08",
    type: "credit",
    amount: 100,
    description: "Referral bonus",
    status: "completed",
  },
  {
    id: "wtx-2",
    date: "2026-06-24",
    type: "credit",
    amount: 350,
    description: "Return refund — order #24390",
    status: "completed",
  },
  {
    id: "wtx-3",
    date: "2026-06-10",
    type: "debit",
    amount: 200,
    description: "Applied to order #24102",
    status: "completed",
  },
];
