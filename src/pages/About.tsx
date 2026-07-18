import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { site } from "@/config/site";
import heroModel1 from "@/assets/hero-model-1.jpg";
import heroModel2 from "@/assets/hero-model-2.jpg";

const represents = [
  "The way you carry yourself",
  "The confidence you embody",
  "The story you express without words",
];

/* About / brand story (Figma About 1:1241) — real copy provided by the brand. */
export default function About() {
  return (
    <div>
      {/* Intro */}
      <section className="bg-surface" aria-labelledby="about-heading">
        <div className="mx-auto w-full max-w-[860px] px-6 py-[88px] text-center">
          <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Our Story</p>
          <h1
            id="about-heading"
            className="mx-auto mt-3 max-w-[720px] font-display text-[38px] leading-[50px] font-medium text-white"
          >
            Every woman deserves to be seen, heard, and celebrated for who she truly is.
          </h1>
          <p className="mx-auto mt-6 max-w-[680px] text-[16px] leading-[27px] text-body">
            Founded by a young visionary with a deep passion for fashion, LOOK is more than just a
            clothing brand. It is a story of ambition, creativity, and purpose. What began as a
            dream has grown into a space where style meets purpose and women embrace who they are
            without hesitation.
          </p>
        </div>
      </section>

      {/* Founder story + imagery */}
      <section className="mx-auto w-full max-w-[1338px] px-6 py-[88px] min-[1400px]:px-0">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_460px] lg:gap-[100px]">
          <div>
            <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Who We Design For</p>
            <h2 className="mt-3 max-w-[520px] font-display text-[32px] leading-[44px] font-medium text-heading-soft">
              For women who define their own paths
            </h2>
            <p className="mt-5 max-w-[600px] text-[16px] leading-[27px] text-body">
              At LOOK, we design garments for women who are bold in their choices, graceful in their
              presence, confident in their identity, and unapologetically themselves. LOOK is more
              than just a name — it is a feeling, a statement, and an identity.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {represents.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex size-[28px] shrink-0 items-center justify-center rounded-full bg-accent text-white">
                    <Check className="size-[15px]" strokeWidth={2.5} />
                  </span>
                  <span className="text-[16px] leading-[24px] text-white">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* editorial photo pair */}
          <div className="relative hidden h-[440px] lg:block">
            <div className="absolute top-0 left-0 w-[300px] overflow-hidden rounded-img border-4 border-line bg-surface shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <img src={heroModel1} alt="" className="aspect-[3/4] w-full object-cover object-top" />
            </div>
            <div className="absolute right-0 bottom-0 w-[210px] overflow-hidden rounded-img border-4 border-line bg-surface shadow-[-3px_4px_20px_rgba(0,0,0,0.5)]">
              <img src={heroModel2} alt="" className="aspect-[3/4] w-full object-cover object-top" />
            </div>
          </div>
        </div>

        <p className="mt-[64px] max-w-[820px] text-[16px] leading-[27px] text-body">
          LOOK is created for women of every skin tone, every body type, and every form — not
          limited to one standard of beauty. Whether you are petite, curvy, lean, or bold in your
          silhouette, our designs are made to complement you. With a focus on comfort and
          customization, we ensure that every woman can find her perfect fit and feel confident in
          her own skin.
        </p>
        <p className="mt-6 font-script text-[30px] leading-[1.25] text-accent-bright">
          Because at LOOK, fashion is not just about what you wear — it is about how you express who
          you are.
        </p>
      </section>

      {/* Vision + Mission */}
      <section className="bg-surface">
        <div className="mx-auto grid w-full max-w-[1338px] grid-cols-1 gap-12 px-6 py-[80px] lg:grid-cols-2 lg:gap-[80px] min-[1400px]:px-0">
          <div>
            <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Our Vision</p>
            <h2 className="mt-3 font-display text-[28px] leading-[38px] font-medium text-heading-soft">
              Fashion that empowers every woman
            </h2>
            <p className="mt-4 text-[16px] leading-[27px] text-body">
              To create a world where fashion empowers every woman to feel confident, seen, and
              celebrated. We envision LOOK as more than a brand — a destination where style becomes a
              statement of identity, where every design inspires confidence, and where every woman
              feels effortlessly powerful in what she wears.
            </p>
          </div>
          <div>
            <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Our Mission</p>
            <h2 className="mt-3 font-display text-[28px] leading-[38px] font-medium text-heading-soft">
              Comfort, elegance, and individuality
            </h2>
            <p className="mt-4 text-[16px] leading-[27px] text-body">
              To create modern, thoughtfully designed fashion that blends comfort, elegance, and
              individuality — contemporary western wear and everyday essentials for women who value
              both style and ease. As we grow, LOOK aims to expand into ethnic wear, bringing a
              fresh, creative perspective to traditional fashion while preserving its cultural
              beauty and essence.
            </p>
          </div>
        </div>
      </section>

      {/* Founder sign-off */}
      <section className="mx-auto w-full max-w-[820px] px-6 py-[88px] text-center">
        <p className="text-[16px] leading-[27px] text-body">
          LOOK is proudly founded by a young girl who believes in the power of women showing their
          individuality and self-expression. This brand is not just about fashion — it is about
          creating a space where women feel confident, empowered, and comfortable in their own skin.
          Every collection is designed with heart, passion, and a genuine desire to make women feel
          their best.
        </p>
        <p className="mt-6 text-[16px] leading-[27px] text-body">
          Your trust means everything to us, and every piece you choose from LOOK is a step in
          building this dream together. Thank you for being a part of this journey.
        </p>
        <p className="mt-8 font-script text-[34px] leading-none text-accent-bright">
          {site.founder}
        </p>
        <p className="mt-2 text-[14px] tracking-[0.04em] text-muted uppercase">
          CEO &amp; Founder, LOOK
        </p>

        <Link
          to="/shop"
          className="mt-10 inline-flex items-center justify-center rounded-btn bg-white px-6 py-3 text-[16px] font-medium text-black shadow-xs transition-opacity hover:opacity-85"
        >
          Explore the Collection
        </Link>
      </section>
    </div>
  );
}
