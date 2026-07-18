import { site } from "@/config/site";

interface Section {
  heading: string;
  body: string[];
}

const sections: Section[] = [
  {
    heading: "Information We Collect",
    body: [
      "To provide you with a seamless shopping experience, we may collect personal information including your name, email address, phone number, billing and shipping address, purchase history, and account details. If you choose to create an account, we securely store your login information so you can easily access your orders and save your preferences.",
      "When you browse our website, we may also collect technical information such as your IP address, browser type, device information, and cookies to improve website performance and personalize your shopping experience. If you opt for customized garments, we may collect the measurements or fitting details that you voluntarily provide for that specific order.",
    ],
  },
  {
    heading: "How We Use Your Information",
    body: [
      "The information we collect helps us deliver a smooth and personalized shopping experience. It enables us to process your orders, confirm payments, arrange shipping, provide customer support, manage returns or exchanges, and notify you about your order status.",
      "We may also use your information to understand customer preferences, improve our collections, recommend products that may interest you, and keep you informed about new arrivals, exclusive launches, seasonal collections, and promotional offers if you have chosen to receive marketing communications.",
    ],
  },
  {
    heading: "Customization & Sizing Information",
    body: [
      "At LOOK, we believe every woman deserves clothing that feels made for her. If you request a customized garment or provide sizing preferences, the information you share will be used solely for creating and delivering your customized order. Your measurements are kept confidential and are never shared or used for any purpose other than fulfilling your request.",
    ],
  },
  {
    heading: "Payment Security",
    body: [
      "Your payment security is one of our highest priorities. All transactions on our website are processed through trusted and secure payment gateways using industry-standard encryption technologies. LOOK never stores your debit card details, credit card information, UPI PIN, CVV, or banking passwords on our servers.",
      "For selected products where Partial Cash on Delivery (COD) is available, customers are required to pay 50% of the order value in advance, while the remaining balance can be paid upon delivery. This helps us process and fulfill orders efficiently while reducing order cancellations.",
    ],
  },
  {
    heading: "Cookies",
    body: [
      "Our website uses cookies and similar technologies to provide you with a better browsing experience. Cookies help us remember your preferences, keep items in your shopping cart, improve website functionality, understand visitor behavior, and enhance the overall shopping experience. You may disable cookies through your browser settings; however, certain features of the website may not function as intended.",
    ],
  },
  {
    heading: "Sharing Your Information",
    body: [
      "We respect your privacy and never sell, rent, or trade your personal information. Your information is shared only with trusted service providers who help us operate our business, including payment gateways, shipping partners, logistics providers, website hosting services, and customer support platforms. These partners receive only the information necessary to perform their services and are required to maintain the confidentiality of your data.",
    ],
  },
  {
    heading: "Product Reviews & User Content",
    body: [
      "If you choose to submit product reviews, testimonials, photos, or other content on our website or social media platforms, you grant LOOK permission to display this content for promotional or informational purposes. We may feature customer reviews or images while always respecting your privacy and without disclosing sensitive personal information.",
    ],
  },
  {
    heading: "Data Protection",
    body: [
      "We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, misuse, loss, or disclosure. While no online platform can guarantee absolute security, we continuously monitor and improve our systems to ensure your information remains protected.",
    ],
  },
  {
    heading: "Marketing Communications",
    body: [
      "If you subscribe to our newsletter or choose to receive updates, we may send you information about new collections, exclusive launches, special promotions, styling inspiration, and other brand news. You can unsubscribe from these communications at any time through the unsubscribe link in our emails or by contacting our support team.",
    ],
  },
  {
    heading: "Your Rights",
    body: [
      "You have the right to access the personal information we hold about you, request corrections to inaccurate information, update your account details, or request deletion of your data where legally applicable. If you wish to exercise any of these rights, our customer support team will be happy to assist you.",
    ],
  },
  {
    heading: "Third-Party Services",
    body: [
      "Our website may contain links to third-party platforms such as Instagram, Facebook, payment providers, or shipping partners. While we work only with trusted partners, LOOK is not responsible for the privacy practices or content of external websites. We encourage you to review their privacy policies before sharing any personal information.",
    ],
  },
  {
    heading: "Policy Updates",
    body: [
      "As LOOK continues to grow and evolve, we may update this Privacy Policy from time to time to reflect changes in our services, legal requirements, or business practices. Any updates will be published on this page along with the revised effective date. By continuing to use our website after changes have been posted, you agree to the updated Privacy Policy.",
    ],
  },
];

export default function Privacy() {
  return (
    <div className="mx-auto w-full max-w-[820px] px-6 py-[72px]">
      <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Legal</p>
      <h1 className="mt-3 font-display text-[38px] leading-[48px] font-medium text-white">
        Privacy Policy
      </h1>
      <p className="mt-3 text-[13px] text-muted">Last updated: 18 July 2026</p>

      <p className="mt-8 text-[16px] leading-[27px] text-body">
        Welcome to LOOK. We believe that trust is the foundation of every meaningful relationship,
        and that includes the relationship we build with our customers. When you choose LOOK, you’re
        not only choosing thoughtfully designed fashion but also a brand that values your privacy and
        respects your personal information. This Privacy Policy explains how we collect, use, store,
        and protect your information whenever you visit our website, create an account, browse our
        collections, or make a purchase.
      </p>

      <div className="mt-10 flex flex-col gap-9">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-[22px] leading-[30px] font-medium text-heading-soft">
              {s.heading}
            </h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-3 text-[16px] leading-[27px] text-body">
                {p}
              </p>
            ))}
          </section>
        ))}

        <section>
          <h2 className="font-display text-[22px] leading-[30px] font-medium text-heading-soft">
            Contact Us
          </h2>
          <p className="mt-3 text-[16px] leading-[27px] text-body">
            If you have any questions regarding this Privacy Policy or the way your personal
            information is collected, stored, or used, please feel free to contact us. Our team is
            always here to assist you.
          </p>
          <p className="mt-4 text-[16px] leading-[28px] text-body">
            Email:{" "}
            <a href={site.emailHref} className="font-medium text-accent hover:underline">
              {site.email}
            </a>
            <br />
            Phone:{" "}
            <a href={site.phoneHref} className="font-medium text-accent hover:underline">
              {site.phone}
            </a>
          </p>
        </section>

        <section className="rounded-card bg-card p-7">
          <h2 className="font-display text-[22px] leading-[30px] font-medium text-heading-soft">
            Our Promise
          </h2>
          <p className="mt-3 text-[16px] leading-[27px] text-body">
            At LOOK, every stitch reflects care, every design celebrates individuality, and every
            customer relationship is built on trust. We are committed to protecting your privacy with
            the same dedication, integrity, and attention to detail that goes into creating every
            LOOK collection. Thank you for choosing us and for being a valued part of our journey.
          </p>
        </section>
      </div>
    </div>
  );
}
