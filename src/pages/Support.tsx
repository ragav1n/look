import type { ReactNode } from "react";
import { MessageCircle, Mail } from "lucide-react";
import { site } from "@/config/site";
import FaqSection from "./home/FaqSection";

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

export default function Support() {
  return (
    <div>
      <section className="bg-surface">
        <div className="mx-auto w-full max-w-[900px] px-6 py-[72px] text-center">
          <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Support</p>
          <h1 className="mt-3 font-display text-[38px] leading-[48px] font-medium text-white">
            We’re here to help
          </h1>
          <p className="mx-auto mt-3 max-w-[560px] text-[16px] leading-[26px] text-body">
            Questions about an order, sizing, returns, or customization? Message us on WhatsApp for
            the quickest reply, or reach us any way you like.
          </p>

          {/* Primary WhatsApp CTA — chat directly instead of only calling */}
          <a
            href={site.whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center justify-center gap-2.5 rounded-btn bg-accent px-7 py-3.5 text-[15px] font-medium text-white transition hover:scale-[1.02] hover:bg-accent-bright"
          >
            <MessageCircle className="size-5" />
            Chat on WhatsApp
          </a>

          <div className="mx-auto mt-10 grid max-w-[640px] grid-cols-1 gap-4 sm:grid-cols-3">
            <ContactCard
              href={site.whatsappHref}
              external
              icon={<MessageCircle className="size-5" />}
              title="WhatsApp"
              value={site.phone}
            />
            <ContactCard
              href={site.emailHref}
              icon={<Mail className="size-5" />}
              title="Email"
              value={
                <>
                  {site.email.split("@")[0]}@<wbr />
                  {site.email.split("@")[1]}
                </>
              }
            />
            <ContactCard
              href={site.instagram}
              external
              icon={<InstagramGlyph className="size-5" />}
              title="Instagram"
              value={site.instagramHandle}
            />
          </div>
        </div>
      </section>

      <FaqSection />
    </div>
  );
}

function ContactCard({
  href,
  external,
  icon,
  title,
  value,
}: {
  href: string;
  external?: boolean;
  icon: ReactNode;
  title: string;
  value: ReactNode;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="group flex flex-col items-center gap-2 rounded-card border border-line bg-card p-5 text-center transition-colors hover:border-accent"
    >
      <span className="grid size-10 place-items-center rounded-full border border-line-strong text-accent transition-colors group-hover:border-accent">
        {icon}
      </span>
      <p className="text-[13px] text-muted">{title}</p>
      <p className="text-[14px] font-medium break-words text-white">{value}</p>
    </a>
  );
}
