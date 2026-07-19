import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { site } from "@/config/site";
import logoWhite from "@/assets/look-logo-white.png";

/* Inline WhatsApp glyph (currentColor) — this lucide version ships no brand icons. */
function WhatsAppGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.045zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.668-1.611-.916-2.206-.241-.579-.486-.5-.668-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
    </svg>
  );
}

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
   Shop links carry the canonical filter key (not Shopify's raw handle) so the
   Shop sidebar highlights the matching category on arrival.
   "Terms of Service" still points at /support: LOOK hasn't supplied terms copy,
   and inventing binding terms for a live store isn't ours to do. */
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
      { label: "Return / Exchange Policy", to: "/returns" },
      { label: "Terms of Service", to: "/support" },
      { label: "Shipping Policy", to: "/shipping" },
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

/* Footer link: accent rule sweeps out from the left on hover/focus, the label
   eases across to meet it, and a click compresses it briefly so the press is
   acknowledged before the route transition takes over. */
function FooterLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="group/link inline-flex items-center gap-0 text-[15px] leading-[22px] text-white/80 transition-colors duration-300 hover:text-accent focus-visible:text-accent focus-visible:outline-none active:scale-[0.97] motion-reduce:active:scale-100"
    >
      <span
        aria-hidden
        className="mr-0 h-[1.5px] w-0 bg-accent transition-all duration-300 ease-out group-hover/link:mr-2 group-hover/link:w-4 group-focus-visible/link:mr-2 group-focus-visible/link:w-4 motion-reduce:transition-none"
      />
      <span className="transition-transform duration-300 ease-out motion-reduce:transition-none">
        {label}
      </span>
    </Link>
  );
}

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

          <div className="mt-6 flex flex-col gap-2.5 text-[14px] leading-[24px] text-white/80">
            <a
              href={site.emailHref}
              className="group inline-flex items-center gap-2.5 transition-colors hover:text-accent"
            >
              <Mail
                className="size-[18px] shrink-0 text-white/60 transition-colors group-hover:text-accent"
                strokeWidth={1.8}
              />
              {site.email}
            </a>
            <a
              href={site.whatsappHref}
              target="_blank"
              rel="noreferrer"
              aria-label={`Chat with LOOK on WhatsApp (${site.phone})`}
              className="group inline-flex items-center gap-2.5 transition-colors hover:text-accent"
            >
              <WhatsAppGlyph className="size-[18px] shrink-0 text-white/60 transition-colors group-hover:text-accent" />
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
                  <FooterLink to={to} label={label} />
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
