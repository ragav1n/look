import PolicyPage, { type PolicySection } from "@/components/layout/PolicyPage";

/* Shipping Policy.
   Sourced from LOOK's existing shipping/COD FAQ answers (src/data/faqs.ts) and
   the Privacy page's Partial COD terms. Deliberately NOT invented: shipping
   charges, free-shipping thresholds, courier names, international delivery,
   guaranteed delivery dates. Those need the brand's own numbers. */
const sections: PolicySection[] = [
  {
    heading: "Order Processing",
    body: [
      "Orders are usually processed within 3–6 business days. Processing covers the time we take to prepare, quality-check, and pack your order before it is handed to our delivery partner — it does not include the time the courier takes to reach you.",
      "Customised and made-to-measure pieces are created individually and may take longer to prepare. If your order includes one, we will let you know what to expect.",
    ],
  },
  {
    heading: "Delivery Coverage",
    body: [
      "We deliver to most locations across India through our trusted delivery partners. Delivery timelines vary depending on where you are — metro addresses typically arrive sooner than remote ones.",
      "If you are unsure whether we currently deliver to your pin code, message us before ordering and we will check for you.",
    ],
  },
  {
    heading: "Payment & Partial COD",
    body: [
      "Cash on Delivery is available on selected products through our Partial COD option. To confirm a Partial COD order, 50% of the product value is paid in advance, and the remaining 50% is paid in cash when your order is delivered. This helps us prepare and dispatch orders efficiently.",
      "All online payments are processed through secure payment gateways. LOOK never stores your card details, UPI PIN, CVV, or banking passwords.",
    ],
  },
  {
    heading: "Tracking Your Order",
    body: [
      "Once your order has been dispatched, we will share tracking details with you on the contact number or email address provided at checkout. If your order seems delayed, or tracking hasn't updated in a while, contact us and we will follow it up with the courier on your behalf.",
    ],
  },
];

export default function Shipping() {
  return (
    <PolicyPage
      title="Shipping Policy"
      lastUpdated="19 July 2026"
      intro="Everything we make is packed and sent with care. This page explains how long we take to prepare an order, where we deliver, and how payment works — including our Partial Cash on Delivery option. If your order is time-sensitive, message us before placing it and we will tell you honestly whether we can make it."
      sections={sections}
      contactIntro="If you have a question about delivery to your area, a pending order, or tracking that hasn't updated, please reach out. Our team is always here to assist you."
    />
  );
}
