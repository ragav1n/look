import PolicyPage, { type PolicySection } from "@/components/layout/PolicyPage";

/* Return / Exchange Policy.
   Every statement here is drawn from copy LOOK already publishes — the returns
   and customisation FAQ answers (src/data/faqs.ts) and the Privacy page's
   Partial COD terms. Deliberately NOT invented: the length of the return
   window, refund processing times, who pays return shipping, restocking fees.
   Those need the brand's own numbers before they go in. */
const sections: PolicySection[] = [
  {
    heading: "Eligibility",
    body: [
      "We accept returns and exchanges on eligible products within our return policy period. To be eligible, the item must be unused, unwashed, and in its original condition, with all tags still intact.",
      "Please keep the original packaging until you are sure you are keeping the piece. Items that show signs of wear, washing, alteration, or missing tags cannot be accepted.",
    ],
  },
  {
    heading: "How to Request a Return or Exchange",
    body: [
      "Reach out to us before sending anything back, so we can confirm that your item is eligible and guide you through the process. You can contact us on WhatsApp, by email, or through Instagram — WhatsApp is usually the quickest way to get a reply.",
      "When you get in touch, please have your order details and a photograph of the item ready. It helps us resolve your request faster.",
    ],
  },
  {
    heading: "Customised & Made-to-Measure Orders",
    body: [
      "Selected styles at LOOK can be customised, and those pieces are made specifically to the measurements you share with us. Because of that, customisation requests should always be discussed with us before you place your order. If you have any concern about fit or finish on a customised piece, contact us and we will do our best to help.",
    ],
  },
  {
    heading: "Orders Paid by Partial COD",
    body: [
      "For products bought using our Partial Cash on Delivery option — 50% paid in advance and the remaining 50% paid on delivery — returns and exchanges follow the same eligibility rules described above. Please contact us directly so we can walk you through how the advance payment is handled for your specific order.",
    ],
  },
];

export default function Returns() {
  return (
    <PolicyPage
      title="Return & Exchange Policy"
      lastUpdated="19 July 2026"
      intro="We want you to love what you receive. If a piece isn't right for you, we're happy to look at a return or exchange — this page explains when that's possible, and the easiest way to arrange it. If anything here is unclear, just message us; we would always rather talk it through than have you guess."
      sections={sections}
      contactIntro="If you have a question about a return, an exchange, or an order that hasn't arrived as expected, please get in touch. Our team is always here to assist you."
    />
  );
}
