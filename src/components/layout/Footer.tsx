import { Link } from "react-router-dom";
import { site } from "@/config/site";
import logoBlack from "@/assets/look-logo-black.png";
import iconInstagram from "@/assets/icon-instagram.svg";

const columns = [
  {
    heading: "Company",
    links: [
      { label: "Home", to: "/" },
      { label: "Shop", to: "/shop" },
      { label: "About us", to: "/about" },
      { label: "Contact us", to: "/support" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      // Terms & Return Policy pages pending brand copy — routed to support for now.
      { label: "Terms & Conditions", to: "/support" },
      { label: "Return Policy", to: "/support" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-page">
      <div className="mx-auto grid w-full max-w-[1227px] grid-cols-1 gap-12 px-6 py-[72px] sm:grid-cols-2 lg:grid-cols-[280px_1fr_1fr] lg:gap-[120px] min-[1300px]:px-0">
        <div>
          <img src={logoBlack} alt="LOOK" className="w-[105px] object-contain" />
          <p className="mt-4 max-w-[247px] text-[14px] leading-[26px] tracking-[-0.1px] text-footer-ink/70">
            Modern western essentials — curated kurta and coord sets designed for comfort,
            confidence, and everyday elegance.
          </p>

          <div className="mt-5 flex flex-col gap-1.5 text-[14px] leading-[24px] text-footer-ink/80">
            <a href={site.emailHref} className="hover:text-accent">
              {site.email}
            </a>
            <a href={site.phoneHref} className="hover:text-accent">
              {site.phone}
            </a>
          </div>

          <a
            href={site.instagram}
            target="_blank"
            rel="noreferrer"
            aria-label={`LOOK on Instagram (${site.instagramHandle})`}
            className="mt-5 inline-flex items-center gap-2 text-[14px] text-footer-ink/80 hover:text-accent"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lavender">
              <img src={iconInstagram} alt="" className="h-[17px] w-[17px]" />
            </span>
            {site.instagramHandle}
          </a>
        </div>

        {columns.map(({ heading, links }) => (
          <nav key={heading} aria-label={heading}>
            <p className="text-[15px] leading-[26px] tracking-[-0.1px] text-body">{heading}</p>
            <ul className="mt-[17px]">
              {links.map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-[16px] leading-[40px] tracking-[-0.2px] text-footer-ink hover:text-accent"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
