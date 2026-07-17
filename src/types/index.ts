export type Category = "Kurta Set" | "Coord Set" | "Tops" | "Bottom";

export interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  category: Category;
  /** Secondary label shown on cards, e.g. "Tops" */
  group: string;
  price: number;
  mrp?: number;
  badge?: "New" | "Sale";
  images: string[];
  colors: { name: string; hex: string }[];
  sizes: string[];
  rating: number;
  reviewCount: number;
  stockLeft?: number;
  description: string;
  details: { title: string; body: string[] };
  bestSeller?: boolean;
  newArrival?: boolean;
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  verified?: boolean;
}

export interface CartItem {
  productId: string;
  color: string;
  size: string;
  qty: number;
}

export type OrderStatus =
  | "ordered"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export interface Order {
  id: string;
  placedAt: string;
  status: OrderStatus;
  items: (CartItem & { name: string; price: number; image: string })[];
  address: Address;
  shippingMethod: string;
  paymentMethod: string;
  totals: { subtotal: number; shipping: number; taxes: number; total: number };
  timeline: { status: OrderStatus; at: string | null }[];
  shipmentUpdates: { at: string; text: string }[];
  courier?: { name: string; trackingId: string; phone: string };
}

export interface Address {
  id: string;
  label: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault?: boolean;
}

export interface WalletTransaction {
  id: string;
  date: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  status: "completed" | "pending";
}

export interface Faq {
  id: string;
  category: string;
  q: string;
  a: string;
}
