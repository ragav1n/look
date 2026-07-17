import { site } from "@/config/site";
import FaqSection from "./home/FaqSection";

export default function Support() {
  return (
    <div>
      <section className="bg-surface">
        <div className="mx-auto w-full max-w-[900px] px-6 py-[72px] text-center">
          <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Support</p>
          <h1 className="mt-3 font-display text-[38px] leading-[48px] font-medium text-black">
            We’re here to help
          </h1>
          <p className="mx-auto mt-3 max-w-[560px] text-[16px] leading-[26px] text-body">
            Questions about an order, sizing, returns, or customization? Reach out and our team will
            get back to you as soon as possible.
          </p>

          <div className="mx-auto mt-8 grid max-w-[720px] grid-cols-1 gap-4 sm:grid-cols-3">
            <a
              href={site.emailHref}
              className="rounded-card border border-line bg-white p-5 transition-colors hover:border-accent"
            >
              <p className="text-[13px] text-muted">Email</p>
              <p className="mt-1 text-[15px] font-medium break-words text-black">{site.email}</p>
            </a>
            <a
              href={site.phoneHref}
              className="rounded-card border border-line bg-white p-5 transition-colors hover:border-accent"
            >
              <p className="text-[13px] text-muted">Phone</p>
              <p className="mt-1 text-[15px] font-medium text-black">{site.phone}</p>
            </a>
            <a
              href={site.instagram}
              target="_blank"
              rel="noreferrer"
              className="rounded-card border border-line bg-white p-5 transition-colors hover:border-accent"
            >
              <p className="text-[13px] text-muted">Instagram</p>
              <p className="mt-1 text-[15px] font-medium text-black">{site.instagramHandle}</p>
            </a>
          </div>
        </div>
      </section>

      <FaqSection />
    </div>
  );
}
