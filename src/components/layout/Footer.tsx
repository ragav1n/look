import { Link } from "react-router-dom";
import logoBlack from "@/assets/look-logo-black.png";
import iconTwitter from "@/assets/icon-twitter.svg";
import iconFacebook from "@/assets/icon-facebook.svg";
import iconInstagram from "@/assets/icon-instagram.svg";
import iconLinkedin from "@/assets/icon-linkedin.svg";

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
      { label: "Privacy Policy", to: "/support" },
      { label: "Terms & Conditions", to: "/support" },
      { label: "Return Policy", to: "/support" },
    ],
  },
];

const socials = [
  { icon: iconTwitter, label: "Twitter", href: "https://twitter.com" },
  { icon: iconFacebook, label: "Facebook", href: "https://facebook.com" },
  { icon: iconInstagram, label: "Instagram", href: "https://www.instagram.com/look_.in" },
  { icon: iconLinkedin, label: "LinkedIn", href: "https://linkedin.com" },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-page">
      <div className="mx-auto grid w-full max-w-[1227px] grid-cols-1 gap-12 px-6 py-[72px] sm:grid-cols-2 lg:grid-cols-[250px_1fr_1fr] lg:gap-[120px] min-[1300px]:px-0">
        <div>
          <img src={logoBlack} alt="LOOK" className="h-[48px] w-auto object-contain" />
          <p className="mt-4 max-w-[247px] text-[14px] leading-[26px] text-footer-ink/70 tracking-[-0.1px]">
            Modern western essentials — curated kurta and coord sets designed for
            comfort, confidence, and everyday elegance.
          </p>
          <div className="mt-6 flex items-center gap-[18px]">
            {socials.map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={`LOOK on ${label}`}
                className="flex h-8 w-8 items-center justify-center"
              >
                <img src={icon} alt="" className="h-[17px] w-[17px]" />
              </a>
            ))}
          </div>
        </div>
        {columns.map(({ heading, links }) => (
          <nav key={heading} aria-label={heading}>
            <p className="text-[15px] leading-[26px] text-body tracking-[-0.1px]">{heading}</p>
            <ul className="mt-[17px]">
              {links.map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-[16px] leading-[40px] text-footer-ink tracking-[-0.2px] hover:text-accent"
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
