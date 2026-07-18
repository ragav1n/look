import { Link } from "react-router-dom";
import { site } from "@/config/site";
import logoWhite from "@/assets/look-logo-white.png";

/* Inline Instagram glyph (currentColor) — this lucide version ships no brand icons. */
function InstagramGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* Footer — black theme, white text.
   Link routes: LOOK's catalog doesn't have dedicated Dresses/Bottoms/Shipping
   pages yet, so those point at the closest existing route (Shop with a filter,
   or Contact) until brand pages/collections are added. */
const columns = [
  {
    heading: "Shop",
    links: [
      { label: "What's New?", to: "/shop?col=new-arrivals" },
      { label: "Co-Ords", to: "/shop?col=co-ords" },
      { label: "Dresses", to: "/shop?col=dresses" },
      { label: "Tops", to: "/shop?col=tops" },
      { label: "Bottoms", to: "/shop?col=bottoms" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Return / Exchange Policy", to: "/support" },
      { label: "Terms of Service", to: "/support" },
      { label: "Shipping Policy", to: "/support" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Contact Us", to: "/support" },
      { label: "About Us", to: "/about" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black text-white">
      <div className="mx-auto grid w-full max-w-[1227px] grid-cols-1 gap-12 px-6 py-[72px] sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.9fr] lg:gap-[64px] min-[1300px]:px-0">
        {/* Brand + contact */}
        <div>
          <img src={logoWhite} alt="LOOK" className="w-[110px] object-contain" />
          <p className="mt-5 max-w-[300px] text-[14px] leading-[24px] text-white/70">
            At LOOK, we make every woman feel confident, beautiful, and extraordinary through
            thoughtfully crafted western wear that celebrates her unique style.
          </p>

          <div className="mt-6 flex flex-col gap-1.5 text-[14px] leading-[24px] text-white/80">
            <a href={site.emailHref} className="transition-colors hover:text-accent">
              {site.email}
            </a>
            <a
              href={site.whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-accent"
            >
              {site.phone}
            </a>
          </div>

          <div className="mt-6">
            <p className="text-[13px] font-medium tracking-[0.06em] text-white/60 uppercase">
              Follow Us
            </p>
            <a
              href={site.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label={`LOOK on Instagram (${site.instagramHandle})`}
              className="mt-3 inline-flex items-center gap-2.5 text-[14px] text-white/80 transition-colors hover:text-white"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 transition-colors hover:border-accent hover:bg-accent">
                <InstagramGlyph className="size-[18px]" />
              </span>
              {site.instagramHandle}
            </a>
          </div>
        </div>

        {/* Link columns */}
        {columns.map(({ heading, links }) => (
          <nav key={heading} aria-label={heading}>
            <p className="text-[13px] font-semibold tracking-[0.08em] text-white/50 uppercase">
              {heading}
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {links.map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-[15px] leading-[22px] text-white/80 transition-colors hover:text-accent"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1227px] flex-col gap-2 px-6 py-6 text-[13px] text-white/50 sm:flex-row sm:items-center sm:justify-between min-[1300px]:px-0">
          <p>© {new Date().getFullYear()} LOOK. All rights reserved.</p>
          <p>{site.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
