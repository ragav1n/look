import PolicyPage, { type PolicySection } from "@/components/layout/PolicyPage";

/* Terms of Service — brand-supplied copy, entered verbatim (2026-07-19).
   Do NOT reword, condense, or restructure any of it: these are binding terms
   and the wording is the brand's own. "Our Commitment" is the document's
   closing sign-off, so it renders through PolicyPage's `closing` card rather
   than as a numbered section. The Contact Us block is PolicyPage's shared
   sign-off, not part of the supplied text. */
const sections: PolicySection[] = [
  {
    heading: "Acceptance of Terms",
    body: [
      "By using this website, you confirm that you have read, understood, and agreed to these Terms of Service. If you do not agree with any part of these Terms, we kindly request that you discontinue the use of our website and services.",
    ],
  },
  {
    heading: "Products & Product Information",
    body: [
      "At LOOK, every collection is thoughtfully designed to reflect modern elegance, confidence, and individuality. We strive to ensure that all product descriptions, images, measurements, colours, and fabric details displayed on our website are as accurate as possible.",
      "However, slight variations in colour may occur due to differences in lighting during photography or individual screen settings. Fabric texture, print placement, embroidery, or handcrafted details may also vary slightly, making every garment uniquely beautiful.",
      "As fashion evolves, LOOK reserves the right to introduce new collections, discontinue existing products, modify product designs, or update pricing without prior notice.",
    ],
  },
  {
    heading: "Pricing & Payments",
    body: [
      "All prices displayed on the website are in Indian Rupees (INR) and are inclusive of applicable GST unless otherwise mentioned.",
      "Orders will only be processed after successful payment confirmation. For selected products, LOOK offers Partial Cash on Delivery (COD), where customers are required to pay 50% of the total order value in advance, and the remaining balance is payable upon delivery.",
      "LOOK reserves the right to cancel any order if payment authorization fails, pricing errors occur, or fraudulent transactions are suspected.",
    ],
  },
  {
    heading: "Customization Services",
    body: [
      "Certain LOOK garments can be customized based on size, measurements, colour (where applicable), or design modifications.",
      "Customized garments are specially created according to individual customer requirements. For this reason, customized orders cannot be cancelled, returned, exchanged, or refunded unless the product received is damaged, defective, or differs significantly from the confirmed order.",
      "LOOK is not responsible for fitting issues resulting from incorrect measurements provided by the customer.",
    ],
  },
  {
    heading: "Sizing & Fit",
    body: [
      "We recommend referring to our Size Guide before placing your order. While we aim to maintain consistency across all collections, the fit may vary slightly depending on the garment's silhouette, fabric, and construction.",
      "LOOK celebrates every woman, regardless of body shape or size. Selected styles are available with customization options to help achieve a more personalized fit. Customers are responsible for providing accurate measurements when requesting customized garments.",
    ],
  },
  {
    heading: "Order Confirmation",
    body: [
      "Once your order has been successfully placed, it will appear in your LOOK Account under the My Orders section. Customers who create an account on our website can conveniently track their order status, view order history, monitor shipping progress, and access complete purchase details from their dashboard.",
      "To provide a smooth shopping experience, we recommend creating a LOOK account before placing your order.",
      "As every order is carefully prepared for processing immediately after it is placed, cancellations are generally not permitted. However, if you have a genuine and valid reason for requesting a cancellation, you may contact our Customer Support team as soon as possible. Cancellation requests will be reviewed on a case-by-case basis, and approval will be at the sole discretion of LOOK. Once an order has entered production, customization, or dispatch, it cannot be cancelled.",
      "LOOK reserves the right to cancel or refuse any order due to product unavailability, pricing errors, payment verification issues, suspected fraudulent activity, or circumstances beyond our control. If an order is cancelled by LOOK after payment has been successfully received, the applicable amount will be refunded through the original payment method in accordance with our Refund Policy.",
    ],
  },
  {
    heading: "Shipping & Delivery",
    body: [
      "LOOK currently delivers across India through trusted courier and logistics partners. Estimated delivery timelines are provided for your convenience and may vary depending on your location, courier operations, weather conditions, public holidays, or unforeseen circumstances.",
      "While we make every effort to ensure timely delivery, LOOK cannot guarantee exact delivery dates and shall not be held responsible for delays caused by third-party logistics providers.",
      "Customers are responsible for providing a complete and accurate delivery address. LOOK will not be liable for delays or failed deliveries resulting from incorrect or incomplete address details.",
    ],
  },
  {
    heading: "Returns, Exchanges & Cancellations",
    body: [
      "Returns and exchanges are accepted only in accordance with our Return & Exchange Policy.",
      "To qualify for a return or exchange, products must be unused, unwashed, undamaged, and returned with all original tags and packaging intact.",
      "Customized garments, altered products, intimate wear (if applicable), gift cards, and items purchased during final sale or clearance promotions may not be eligible for return or exchange unless received in a damaged or incorrect condition.",
      "Orders may only be cancelled before they are dispatched. Once an order has been shipped, cancellation requests cannot be accepted.",
    ],
  },
  {
    heading: "Promotional Offers & Discount Codes",
    body: [
      "From time to time, LOOK may offer promotional discounts, coupon codes, or exclusive offers. These promotions are subject to their respective terms and conditions and may have validity periods, minimum purchase requirements, or product exclusions.",
      "LOOK reserves the right to modify, suspend, or withdraw any promotional offer without prior notice.",
    ],
  },
  {
    heading: "Intellectual Property",
    body: [
      "All content available on the LOOK website—including our logo, brand name, garment designs, product photography, graphics, website layout, text, videos, illustrations, and other creative materials—is the exclusive intellectual property of LOOK and is protected under applicable copyright, trademark, and intellectual property laws.",
      "No content from this website may be copied, reproduced, modified, distributed, or used for commercial purposes without prior written consent from LOOK.",
    ],
  },
  {
    heading: "Customer Responsibilities",
    body: [
      "Customers agree to provide accurate and complete information while placing orders or creating an account. Any misuse of the website, fraudulent activity, unauthorized access, or actions that interfere with the operation or security of the website are strictly prohibited.",
      "LOOK reserves the right to suspend or terminate access to customers who violate these Terms.",
    ],
  },
  {
    heading: "Limitation of Liability",
    body: [
      "LOOK strives to provide accurate information and high-quality products. However, we shall not be liable for indirect, incidental, special, or consequential damages arising from the use of our website, products, or services.",
      "Our maximum liability, where applicable, shall not exceed the amount paid by the customer for the specific product giving rise to the claim.",
    ],
  },
  {
    heading: "Privacy",
    body: [
      "Your privacy is important to us. All personal information collected through our website is handled responsibly and in accordance with our Privacy Policy. By using our website, you consent to the collection and use of your information as outlined in that policy.",
    ],
  },
  {
    heading: "User Conduct",
    body: [
      "By using our website, you agree not to misuse its content or functionality. Any attempt to interfere with website operations, gain unauthorized access, upload malicious software, submit false information, or engage in fraudulent activities may result in suspension of your access and legal action where applicable.",
    ],
  },
  {
    heading: "Changes to These Terms",
    body: [
      "LOOK reserves the right to revise or update these Terms of Service at any time to reflect changes in our business practices, services, or legal obligations. Updated Terms will be published on this page along with the revised effective date. Continued use of the website after such changes indicates your acceptance of the updated Terms.",
    ],
  },
];

const closing: PolicySection = {
  heading: "Our Commitment",
  body: [
    "At LOOK, we are more than a western wear fashion brand—we are a community that celebrates confidence, individuality, and self-expression. Every garment is thoughtfully designed with premium craftsmanship, inclusive sizing, and exceptional attention to detail, ensuring every woman feels beautiful in her own unique way. By shopping with LOOK, you become part of a brand that values trust, quality, and timeless style above all else. Thank you for choosing LOOK and for allowing us to be part of your journey.",
  ],
};

export default function Terms() {
  return (
    <PolicyPage
      title="Terms of Service"
      lastUpdated="19 July 2026"
      intro={
        'Welcome to LOOK. These Terms of Service ("Terms") govern your use of our website and the purchase of products from LOOK. By accessing our website, creating an account, or placing an order, you agree to comply with these Terms. Our goal is to provide every customer with a secure, transparent, and enjoyable shopping experience while ensuring the highest standards of quality and service.'
      }
      sections={sections}
      contactIntro="If you have a question about these Terms or about an order placed with us, please get in touch. Our team is always here to assist you."
      closing={closing}
    />
  );
}
