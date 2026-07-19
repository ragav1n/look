import { site } from "@/config/site";

/* A paragraph, or a bullet list. Modelling body as an ordered block list (rather
   than parallel `paragraphs` + `bullets` props) is what lets a list sit *between*
   two paragraphs, which the supplied legal copy does. A bare string stays a
   paragraph, so the pages written before this existed are unaffected. */
export type PolicyBlock = string | { bullets: string[] };

export interface PolicySection {
  heading: string;
  body: PolicyBlock[];
  /** Rendered as h3 beneath the section — for clauses the source document
   *  nests under a parent heading rather than listing flat. */
  subsections?: { heading: string; body: PolicyBlock[] }[];
}

/* Renders a section's ordered blocks. Bullets use real list markers, so the
   source copy's literal "• " prefixes are dropped on entry — the wording is
   untouched, only the marker stops being part of the text. */
function Blocks({ blocks }: { blocks: PolicyBlock[] }) {
  return (
    <>
      {blocks.map((b, i) =>
        typeof b === "string" ? (
          <p key={i} className="mt-3 text-[16px] leading-[27px] text-body">
            {b}
          </p>
        ) : (
          <ul key={i} className="mt-3 flex list-disc flex-col gap-2 pl-5 marker:text-accent">
            {b.bullets.map((li, j) => (
              <li key={j} className="text-[16px] leading-[27px] text-body">
                {li}
              </li>
            ))}
          </ul>
        ),
      )}
    </>
  );
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
  /** An array when the document opens with more than one paragraph. */
  intro: string | string[];
  sections: PolicySection[];
  contactIntro: string;
  /** Optional sign-off rendered as a highlighted card after the contact block. */
  closing?: PolicySection;
}) {
  const introParas = Array.isArray(intro) ? intro : [intro];

  return (
    <div className="mx-auto w-full max-w-[820px] px-6 py-[72px]">
      <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Legal</p>
      <h1 className="mt-3 font-display text-[38px] leading-[48px] font-medium text-white">
        {title}
      </h1>
      <p className="mt-3 text-[13px] text-muted">Last updated: {lastUpdated}</p>

      <div className="mt-8 flex flex-col gap-4">
        {introParas.map((p, i) => (
          <p key={i} className="text-[16px] leading-[27px] text-body">
            {p}
          </p>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-9">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-[22px] leading-[30px] font-medium text-heading-soft">
              {s.heading}
            </h2>
            <Blocks blocks={s.body} />
            {s.subsections?.map((sub) => (
              <div key={sub.heading} className="mt-6">
                <h3 className="font-display text-[17px] leading-[26px] font-medium text-white">
                  {sub.heading}
                </h3>
                <Blocks blocks={sub.body} />
              </div>
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
            <Blocks blocks={closing.body} />
          </section>
        )}
      </div>
    </div>
  );
}
