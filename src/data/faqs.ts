import type { Faq } from "@/types";

/* Real LOOK FAQ content (provided by the brand).

   ONE deliberate deviation, on the client's instruction 2026-08-03: `faq-cod`
   used to answer "Yes" and describe Partial COD (50% advance, 50% on delivery).
   Partial COD was dropped on 2026-07-23 and the store takes UPI and card through
   Razorpay only, so the answer promised a payment method that does not exist.
   The question is kept deliberately — customers do ask it — and only the answer
   changed. Do not restore the old wording. Same removal was made in the Terms
   (see src/pages/Terms.tsx) and the Privacy policy. */
export const faqs: Faq[] = [
  {
    id: "faq-returns",
    category: "Returns & Exchanges",
    q: "Can I return or exchange my order?",
    a: "Yes. We accept returns and exchanges for eligible products within our return policy period, provided the item is unused, unwashed, and in its original condition with all tags intact.",
  },
  {
    id: "faq-shipping-time",
    category: "Shipping",
    q: "How long does shipping take?",
    a: "Orders are usually processed within 3–6 business days. Delivery timelines may vary depending on your location.",
  },
  {
    id: "faq-shipping-coverage",
    category: "Shipping",
    q: "Do you ship across India?",
    a: "Yes, we deliver to most locations across India through our trusted delivery partners.",
  },
  {
    id: "faq-cod",
    category: "Payments",
    q: "Is Cash on Delivery (COD) available?",
    a: "No. We currently accept UPI and card payments only. Your order is confirmed once payment is completed at checkout.",
  },
  {
    id: "faq-custom-sizing",
    category: "Sizing",
    q: "Do you offer customized sizing?",
    a: "Yes! We believe every woman deserves the perfect fit. Selected styles are available for customization. Please contact us before placing your order for customization requests.",
  },
  {
    id: "faq-contact",
    category: "Support",
    q: "How can I contact LOOK?",
    a: "You can reach us through our Contact Us page, email, or Instagram. Our team is always happy to assist you with your queries.",
  },
];
