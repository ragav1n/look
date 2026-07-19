import PolicyPage, { type PolicySection } from "@/components/layout/PolicyPage";

/* Return & Exchange Policy — brand-supplied copy, entered verbatim (2026-07-19).
   Do NOT reword or restructure: these are binding terms in the brand's own
   wording. This REPLACED an earlier version inferred from the FAQ answers,
   which wrongly implied returns were accepted — the real policy is no return,
   no refund, exchange only. The Contact Us block is PolicyPage's shared
   sign-off, not part of the supplied text.

   Deliberate deviations from the supplied document, all on the client's
   instruction 2026-07-19 — none are transcription slips, do not "restore":
     1. "Wrong Product Received": "right after u receive" -> "you". Nothing
        else in that sentence changed; the trailing phrase still reads oddly,
        which is the brand's wording.
     2. Terminal full stops added to the intro's second line and to the last
        line of "Express Delivery", both of which ended bare.
   The "No Refund Policy" bullets are deliberately left unpunctuated: all
   seven are fragments and the list is internally consistent. */
const sections: PolicySection[] = [
  {
    heading: "Our Policy",
    body: [
      "LOOK follows a No Return & No Refund Policy. As our garments are carefully produced, quality checked, and in many cases customized, we do not offer refunds under any circumstances.",
      "However, we understand that genuine issues may arise. Therefore, exchanges are accepted only under the conditions mentioned in this policy.",
    ],
  },
  {
    heading: "Exchange Request Window",
    body: [
      "If you wish to request an exchange, you must contact our Customer Support Team within 24–48 hours of receiving your order.",
      "Exchange requests submitted after this period will not be accepted.",
    ],
  },
  {
    heading: "Eligibility for Exchange",
    body: [
      "To qualify for an exchange, the product must be returned in its original condition.",
      "The garment must be unused, unworn, unwashed, undamaged, and returned with all original tags, labels, packaging, and accessories intact.",
      "Products that show signs of use, washing, perfume, stains, makeup marks, alterations, damage, or missing tags will not be eligible for exchange unless the issue existed at the time of delivery.",
      "LOOK reserves the right to inspect the returned product before approving any exchange request.",
    ],
  },
  {
    heading: "Eligible Reasons for Exchange",
    body: ["Exchange requests will only be considered under the following circumstances:"],
    subsections: [
      {
        heading: "Incorrect Size",
        body: [
          "If you have received the correct product but require a different size, you may request a size exchange (subject to stock availability).",
          "The replacement garment will be dispatched only after we receive and inspect the returned item to ensure it meets our exchange eligibility requirements.",
        ],
      },
      {
        heading: "Wrong Product Received",
        body: [
          "If you receive a product different from the one you ordered, please contact us immediately right after you receive from our delivery.",
          "To process your request, you must provide:",
          {
            bullets: [
              "A continuous parcel opening video starting from the unopened package until the product is completely removed.",
              "The video must be clear, unedited, and without any cuts or pauses.",
            ],
          },
          "This helps us verify the issue and protect both our customers and our brand against fraudulent claims.",
        ],
      },
      {
        heading: "Manufacturing Defect",
        body: [
          "If you believe your garment has a manufacturing defect, please notify our Customer Support Team within 24–48 hours of receiving your order.",
          "A continuous unboxing video and clear photographs of the issue must be submitted for verification.",
          "Once approved after inspection, an exchange will be arranged.",
        ],
      },
    ],
  },
  {
    heading: "Customized & Personalized Orders",
    body: [
      "Customized, altered, or personalized garments are specially made according to your requirements.",
      "Therefore, customized or personalized products are not eligible for cancellation, return, refund, or exchange.",
      "To ensure the perfect fit before placing a customized order, customers are welcome to visit us in person for a trial or measurement consultation, wherever applicable.",
    ],
  },
  {
    heading: "Exchange Shipping Charges",
    body: [
      "For all approved exchanges due to size changes or customer-related requests, the two-way shipping charges (return shipping and re-delivery shipping) must be borne by the customer.",
      "If the exchange is approved because LOOK has delivered the wrong product or a verified manufacturing defect, the shipping charges for the exchange will be borne by LOOK.",
    ],
  },
  {
    heading: "No Refund Policy",
    body: [
      "LOOK maintains a strict No Refund Policy.",
      "Refunds will not be provided for:",
      {
        bullets: [
          "Change of mind",
          "Incorrect size selected by the customer",
          "Colour preference",
          "Delayed delivery due to courier services",
          "Customized or personalized products",
          "Promotional or sale purchases",
          "Any other circumstances except where required by applicable law",
        ],
      },
      "Customers are requested to review all product details carefully before completing their purchase.",
    ],
  },
  {
    heading: "Order Cancellation",
    body: [
      "Once an order has been successfully placed, cancellation is generally not permitted, as processing begins immediately.",
      "Customers are requested to carefully verify the product description, size, colour, quantity, customization details, shipping address, and payment information before completing their purchase.",
      "If you have a genuine reason for requesting cancellation, you may contact our Customer Support Team immediately after placing your order. Such requests will be reviewed on a case-by-case basis and are subject to the sole discretion of LOOK. Orders that have entered production, customization, or dispatch cannot be cancelled.",
    ],
  },
  {
    heading: "Delivery Timeline",
    body: [
      "Once your order is confirmed, it will generally be processed and dispatched within 3–6 business days.",
      "Delivery timelines after dispatch depend on your delivery location and our courier partners. While we work hard to ensure timely deliveries, delays caused by weather conditions, courier operations, public holidays, or unforeseen circumstances are beyond our control.",
    ],
  },
  {
    heading: "Express Delivery",
    body: [
      "If you require your order urgently, please contact our Customer Support Team before placing your order.",
      "Where available, Express Delivery can be arranged at an additional shipping cost, depending on your location and product availability.",
    ],
  },
  {
    heading: "Need Assistance?",
    body: [
      "If you have any questions regarding sizing, fabric, fit, customization, delivery, or our Return & Exchange Policy, we strongly encourage you to contact us before placing your order.",
      "Our team will be happy to assist you in choosing the right product and ensuring you have a smooth shopping experience.",
      "LOOK reserves the right to update, modify, or revise this Return & Exchange Policy at any time without prior notice. Any changes will become effective immediately upon being published on our website. We encourage customers to review this policy before placing an order to stay informed of the latest terms and conditions.",
    ],
  },
];

export default function Returns() {
  return (
    <PolicyPage
      title="Return & Exchange Policy"
      lastUpdated="19 July 2026"
      intro={[
        "At LOOK, every garment is thoughtfully designed and carefully inspected before it reaches you. We are committed to delivering premium quality and ensuring your shopping experience is smooth and transparent. We kindly request that you read our Return & Exchange Policy carefully before placing your order.",
        "By placing an order with LOOK, you acknowledge and agree to the terms outlined below.",
      ]}
      sections={sections}
      contactIntro="If you have a question about an exchange, or about an order that hasn't arrived as expected, please get in touch. Our team is always here to assist you."
    />
  );
}
