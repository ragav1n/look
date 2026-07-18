import { useState } from "react";
import { faqs } from "@/data/faqs";
import Reveal from "@/components/ui/Reveal";

/* Figma FAQ accordion (Home 2007:3505): faq radius 14, one panel open at a
   time, +/- affordance rotating to a cross. Accessible disclosure pattern. */
export default function FaqSection() {
  const [open, setOpen] = useState<string | null>(faqs[0]?.id ?? null);

  return (
    <section className="py-[72px]" aria-labelledby="faq-heading">
      <div className="mx-auto w-full max-w-[820px] px-6">
        <Reveal className="text-center">
          <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Need Help?</p>
          <h2
            id="faq-heading"
            className="mt-2 font-display text-[35px] leading-[47px] font-medium text-white"
          >
            Frequently Asked Questions
          </h2>
        </Reveal>

        <div className="mt-[44px] flex flex-col gap-4">
          {faqs.map((f, i) => {
            const isOpen = open === f.id;
            return (
              <Reveal key={f.id} variant="up" delay={i * 70}>
              <div
                className={`overflow-hidden rounded-[14px] border bg-card transition-colors duration-300 ${
                  isOpen ? "border-accent/40" : "border-line"
                }`}
              >
                <h3 className="m-0">
                  <button
                    type="button"
                    id={`faq-btn-${f.id}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${f.id}`}
                    onClick={() => setOpen(isOpen ? null : f.id)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="text-[17px] leading-[24px] font-medium text-white">{f.q}</span>
                    <span
                      aria-hidden
                      className={`shrink-0 text-[26px] leading-none font-light text-accent transition-transform duration-300 ${
                        isOpen ? "rotate-45" : ""
                      }`}
                    >
                      +
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-panel-${f.id}`}
                  role="region"
                  aria-labelledby={`faq-btn-${f.id}`}
                  className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-[15px] leading-[23px] text-body">{f.a}</p>
                  </div>
                </div>
              </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
