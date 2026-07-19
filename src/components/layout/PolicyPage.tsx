import { site } from "@/config/site";

export interface PolicySection {
  heading: string;
  body: string[];
}

/* Shared shell for the legal pages (Privacy, Returns, Shipping) so they read as
   one document set: same measure, same type scale, same contact sign-off. */
export default function PolicyPage({
  title,
  lastUpdated,
  intro,
  sections,
  contactIntro,
  closing,
}: {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: PolicySection[];
  contactIntro: string;
  /** Optional sign-off rendered as a highlighted card after the contact block. */
  closing?: PolicySection;
}) {
  return (
    <div className="mx-auto w-full max-w-[820px] px-6 py-[72px]">
      <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Legal</p>
      <h1 className="mt-3 font-display text-[38px] leading-[48px] font-medium text-white">
        {title}
      </h1>
      <p className="mt-3 text-[13px] text-muted">Last updated: {lastUpdated}</p>

      <p className="mt-8 text-[16px] leading-[27px] text-body">{intro}</p>

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
          <p className="mt-3 text-[16px] leading-[27px] text-body">{contactIntro}</p>
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

        {closing && (
          <section className="rounded-card bg-card p-7">
            <h2 className="font-display text-[22px] leading-[30px] font-medium text-heading-soft">
              {closing.heading}
            </h2>
            {closing.body.map((p, i) => (
              <p key={i} className="mt-3 text-[16px] leading-[27px] text-body">
                {p}
              </p>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
