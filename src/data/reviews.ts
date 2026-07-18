import type { Review } from "@/types";

/* Editorial/customer reviews. Reviews are not core Shopify catalog data — in
   production these come from a reviews app (e.g. Judge.me) or a product
   metafield. `productName` is denormalised so cards need no product lookup. */
export const reviews: Review[] = [
  {
    id: "r-1",
    productId: "p-red-kurta-set",
    productName: "Red Kurta Set",
    author: "Ananya",
    rating: 5,
    date: "2026-06-28",
    title: "Absolutely stunning quality",
    body: "The fabric feels premium and the fit is exactly as described. I wore it to a family function and got so many compliments. Worth every rupee.",
    verified: true,
  },
  {
    id: "r-2",
    productId: "p-red-kurta-set",
    productName: "Red Kurta Set",
    author: "Priya",
    rating: 4.5,
    date: "2026-06-20",
    title: "Beautiful colour, true to photos",
    body: "The red is rich and doesn't fade after washing. The dupatta drape is lovely. Slightly long for my height but easy to alter.",
    verified: true,
  },
  {
    id: "r-3",
    productId: "p-red-kurta-set",
    productName: "Red Kurta Set",
    author: "Meera",
    rating: 4,
    date: "2026-06-11",
    title: "Comfortable for all-day wear",
    body: "Breathable fabric that held up through a full day of celebrations. The stitching detail around the neckline is beautifully done.",
    verified: false,
  },
  {
    id: "r-4",
    productId: "p-mustard-anarkali",
    productName: "Mustard Anarkali",
    author: "Saara",
    rating: 5,
    date: "2026-07-02",
    title: "My new favourite",
    body: "The flow of this anarkali is unreal. Photographs don't do the colour justice — it glows in evening light.",
    verified: true,
  },
  {
    id: "r-5",
    productId: "p-floral-thread-kurta",
    productName: "Floral Thread-Work Kurta",
    author: "Divya",
    rating: 4.5,
    date: "2026-06-15",
    title: "Elegant thread work",
    body: "Delicate embroidery, neatly finished. Sizing runs true. Shipping was quicker than expected.",
    verified: true,
  },
  {
    id: "r-6",
    productId: "p-scarlet-festive-set",
    productName: "Scarlet Festive Set",
    author: "Ritika",
    rating: 5,
    date: "2026-05-30",
    title: "Festive perfection",
    body: "Wore this for a sangeet and felt incredible. The silk blend catches the light beautifully and the fit was flawless.",
    verified: true,
  },
];

export const reviewsFor = (productId: string) => reviews.filter((r) => r.productId === productId);
