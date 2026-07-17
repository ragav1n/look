import { site } from "@/config/site";

export interface QuickReply {
  label: string;
  answer: string;
}

export const chatGreeting =
  "Hi! I'm LOOK's assistant. How can I help you today? Pick a topic below.";

/* Scripted assistant. Answers mirror the brand's real FAQ/contact content.
   Swap for a live agent / AI backend later. */
export const quickReplies: QuickReply[] = [
  {
    label: "Track my order",
    answer:
      "You can track your order any time from Account → Orders. Open an order to see live shipment updates and courier details.",
  },
  {
    label: "Returns & exchanges",
    answer:
      "We accept returns and exchanges within our return policy period, as long as the item is unused, unwashed, and in original condition with tags intact.",
  },
  {
    label: "Shipping time",
    answer:
      "Orders are usually processed within 3–6 business days. Delivery timelines may vary depending on your location. We ship across most of India.",
  },
  {
    label: "Custom sizing",
    answer:
      "Every woman deserves the perfect fit! Selected styles are available for customization — please contact us before placing your order for custom requests.",
  },
  {
    label: "Talk to a human",
    answer: `Our team is happy to help. Reach us at ${site.email} or ${site.phone}, or DM us ${site.instagramHandle} on Instagram.`,
  },
];
