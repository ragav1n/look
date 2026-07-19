import PolicyPage, { type PolicySection } from "@/components/layout/PolicyPage";

/* Shipping Policy — brand-supplied copy, entered verbatim (2026-07-19).
   Do NOT reword or restructure: the wording is the brand's own. This REPLACED
   an earlier version inferred from the FAQ answers, which invented delivery
   coverage wording and carried a Partial COD section this document doesn't
   have — COD is covered on the Terms page instead. The Contact Us block is
   PolicyPage's shared sign-off, not part of the supplied text.

   DEVIATION under "Shipping Charges" — this wording is NOT the client's, it
   was drafted here 2026-07-19 to their instruction and is pending their
   sign-off. The supplied text made shipping charges non-refundable
   unconditionally, which contradicted the Return & Exchange Policy's promise
   that LOOK bears the cost when it ships the wrong or a defective product.
   The client's stated intent: brand's fault (wrong/damaged, once verified) =>
   LOOK pays; customer-driven (size exchange, change of mind, mistaken order)
   => neither shipping nor product price is refunded. Replace wholesale if
   they send their own wording. */
const sections: PolicySection[] = [
  {
    heading: "Order Confirmation",
    body: [
      "Once your order has been successfully placed, you will receive an order confirmation at the email address provided during checkout. As your order progresses, important updates such as order processing, dispatch, and shipping information will also be shared via email.",
      "For an even better shopping experience, we recommend creating a LOOK account. Your account allows you to conveniently track your order status, view shipping progress, access your order history, and manage your purchases all in one place.",
    ],
  },
  {
    heading: "Order Processing",
    body: [
      "Every order is carefully reviewed, quality checked, and packed before dispatch.",
      "Orders are typically processed and dispatched within 3–6 business days from the date of order confirmation. Business days exclude Sundays and public holidays.",
      "For customized or made-to-order garments, processing times may vary depending on the complexity of the design. If additional time is required, our team will keep you informed.",
    ],
  },
  {
    heading: "Shipping & Delivery Timeline",
    body: [
      "Once your order has been dispatched, the estimated delivery time depends on your shipping location and the courier partner servicing your area. Delivery timelines may vary across different cities and states.",
      "We work with reliable logistics partners to ensure your order reaches you as quickly and safely as possible.",
      "While we always aim to dispatch orders within our standard processing period, there may occasionally be situations beyond our control that affect dispatch or delivery schedules.",
      "These may include seasonal demand, festive shopping periods, public holidays, unforeseen operational circumstances, or delays within the courier network.",
      "Regardless of the situation, our team remains committed to preparing and dispatching every order at the earliest possible opportunity while keeping quality our highest priority.",
    ],
  },
  {
    heading: "Shipping Charges",
    body: [
      "Shipping charges are calculated automatically during checkout based on factors such as your delivery location, package weight, and the selected shipping method.",
      "The applicable shipping charges will be displayed before you complete your payment.",
      "Please note that shipping charges are non-refundable, including in cases where an order is exchanged, cancelled (where applicable), or returned. This applies to customer-initiated requests such as size exchanges, change of mind, or an order placed in error, where the product price is also non-refundable.",
      "The only exception is where the exchange arises from an error on our part — such as a wrong, damaged, or defective product. In those cases, once the issue has been verified, LOOK will bear the applicable shipping charges. We encourage customers to review our Return & Exchange Policy before placing an order.",
    ],
  },
  {
    heading: "Express Delivery",
    body: [
      "If you require your order urgently, you may contact our Customer Support Team before placing your order to check the availability of Express Delivery.",
      "Where available, express shipping can be arranged at an additional shipping cost depending on the delivery location and product availability.",
    ],
  },
  {
    heading: "Shipping Address",
    body: [
      "Customers are responsible for providing a complete and accurate shipping address, including the correct recipient name, phone number, and PIN code.",
      "Please review your shipping details carefully before completing your purchase.",
      "LOOK cannot be held responsible for delays, failed deliveries, additional shipping charges, or orders delivered to an incorrect address due to inaccurate or incomplete information provided by the customer.",
      "If you notice an error in your shipping address after placing an order, please contact us immediately. We will do our best to assist you if your order has not yet been dispatched.",
    ],
  },
  {
    heading: "Failed Delivery Attempts",
    body: [
      "If a delivery attempt is unsuccessful due to an incorrect address, recipient unavailability, refusal to accept the parcel, or failure to respond to the courier partner, the shipment may be returned to LOOK.",
      "Any additional shipping charges incurred for re-dispatching the order will be the responsibility of the customer.",
    ],
  },
  {
    heading: "Policy Updates",
    body: [
      "LOOK reserves the right to modify or update this Shipping Policy at any time without prior notice. Any revisions will become effective immediately upon being published on our website. We encourage customers to review this policy before placing an order to stay informed of any updates.",
    ],
  },
];

export default function Shipping() {
  return (
    <PolicyPage
      title="Shipping Policy"
      lastUpdated="19 July 2026"
      intro="At LOOK, we are committed to delivering your order safely, efficiently, and with the care it deserves. Every garment is carefully inspected, packed, and prepared before it leaves our studio to ensure it reaches you in perfect condition. Please read our Shipping Policy to understand how your order will be processed and delivered."
      sections={sections}
      contactIntro="If you have a question about delivery to your area, a pending order, or tracking that hasn't updated, please reach out. Our team is always here to assist you."
    />
  );
}
