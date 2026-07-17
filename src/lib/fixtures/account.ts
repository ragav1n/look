/**
 * DEV-ONLY account fixtures. Customer profile, orders, addresses, and wallet
 * data live in Shopify's Customer Account API (orders/addresses) or a loyalty
 * app (wallet) — not in this repo. These fixtures back the account UI during
 * development and must be replaced with live Customer Account API calls before
 * launch. No component imports this file directly outside the account layer.
 */
import type { Address, Order, WalletTransaction } from "@/types";
import pdpMain from "@/assets/pdp-main-24.jpg";
import product22 from "@/assets/product-22.jpg";
import product23 from "@/assets/product-23.jpg";

export const addresses: Address[] = [
  {
    id: "addr-1",
    label: "Home",
    name: "Sushmitha R",
    line1: "12, Lotus Residency, MG Road",
    line2: "Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560038",
    phone: "+91 9150002116",
    isDefault: true,
  },
  {
    id: "addr-2",
    label: "Work",
    name: "Sushmitha R",
    line1: "4th Floor, Prestige Tech Park",
    line2: "Kadubeesanahalli",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560103",
    phone: "+91 9150002116",
  },
];

export const orders: Order[] = [
  {
    id: "LK-24817",
    placedAt: "2026-07-08",
    status: "shipped",
    items: [
      {
        productSlug: "red-kurta-set",
        variantId: "fixture:variant:red-kurta-set:Red:M",
        name: "Red Kurta Set",
        image: pdpMain,
        size: "M",
        color: "Red",
        quantity: 1,
        price: 600,
      },
      {
        productSlug: "mustard-anarkali",
        variantId: "fixture:variant:mustard-anarkali:Mustard:L",
        name: "Mustard Anarkali",
        image: product22,
        size: "L",
        color: "Mustard",
        quantity: 1,
        price: 670,
      },
    ],
    address: addresses[0],
    shippingMethod: "Standard Delivery",
    paymentMethod: "Partial COD",
    totals: { subtotal: 1270, shipping: 0, taxes: 64, total: 1334 },
    timeline: [
      { status: "ordered", at: "2026-07-08T10:24:00" },
      { status: "shipped", at: "2026-07-09T16:10:00" },
      { status: "out_for_delivery", at: null },
      { status: "delivered", at: null },
    ],
    shipmentUpdates: [
      { at: "2026-07-09T16:10:00", text: "Shipped from Bengaluru facility" },
      { at: "2026-07-10T08:30:00", text: "In transit — reached Hyderabad hub" },
    ],
    courier: { name: "Delhivery", trackingId: "DL7729184455", phone: "+91 9000000000" },
  },
  {
    id: "LK-24390",
    placedAt: "2026-06-21",
    status: "delivered",
    items: [
      {
        productSlug: "ivory-coord-set",
        variantId: "fixture:variant:ivory-coord-set:Cream:S",
        name: "Ivory Coord Set",
        image: product23,
        size: "S",
        color: "Cream",
        quantity: 1,
        price: 650,
      },
    ],
    address: addresses[0],
    shippingMethod: "Standard Delivery",
    paymentMethod: "Prepaid",
    totals: { subtotal: 650, shipping: 49, taxes: 33, total: 732 },
    timeline: [
      { status: "ordered", at: "2026-06-21T12:00:00" },
      { status: "shipped", at: "2026-06-22T09:00:00" },
      { status: "out_for_delivery", at: "2026-06-24T08:00:00" },
      { status: "delivered", at: "2026-06-24T17:45:00" },
    ],
    shipmentUpdates: [
      { at: "2026-06-24T17:45:00", text: "Delivered — thank you for shopping with LOOK" },
    ],
    courier: { name: "Bluedart", trackingId: "BD5591027733", phone: "+91 9000000000" },
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
    description: "Return refund — order LK-24390",
    status: "completed",
  },
  {
    id: "wtx-3",
    date: "2026-06-10",
    type: "debit",
    amount: 200,
    description: "Applied to order LK-24102",
    status: "completed",
  },
];

export const getOrder = (id: string) => orders.find((o) => o.id === id);
