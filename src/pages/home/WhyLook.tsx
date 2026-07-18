import { BadgePercent, Sparkles, RefreshCw, BadgeCheck, type LucideIcon } from "lucide-react";
import heroModel1 from "@/assets/hero-model-1.jpg";
import heroModel2 from "@/assets/hero-model-2.jpg";
import iconCheck from "@/assets/icon-essence-check.svg";
import Reveal from "@/components/ui/Reveal";

/* Figma benefits bar (2007:3296) + "The Essence Behind Every Design" (2007:3506),
   composed as the user's "Why LOOK?" section. Uniform lucide line-icons keep all
   four glyphs identically sized (the old PNG/SVG mix each had different padding). */
const benefits: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: BadgePercent,
    title: "Exclusive Offers",
    desc: "Enjoy special discounts on selected western wear collections.",
  },
  {
    icon: Sparkles,
    title: "New Arrivals",
    desc: "Discover the latest styles added to our collection.",
  },
  {
    icon: RefreshCw,
    title: "Easy Returns",
    desc: "Hassle-free returns for a worry-free shopping experience.",
  },
  {
    icon: BadgeCheck,
    title: "Premium Quality",
    desc: "Crafted with high-quality fabrics for comfort and durability.",
  },
];

const values = [
  {
    title: "Premium Fabric Quality",
    desc: "We use carefully selected fabrics that provide comfort, durability, and a premium feel, ensuring every outfit looks stylish while remaining comfortable throughout the day.",
  },
  {
    title: "Contemporary Western Designs",
    desc: "Our collections blend classic Western silhouettes with modern trends, offering versatile pieces suitable for casual outings, workwear, and special occasions.",
  },
  {
    title: "Confidence Through Style",
    desc: "Fashion should empower. Our designs focus on helping individuals express their personality and feel confident in every outfit they wear.",
  },
  {
    title: "Attention to Detail",
    desc: "From precise tailoring to refined finishing touches, every garment is crafted with attention to fit, stitching, and overall quality.",
  },
];

export default function WhyLook() {
  return (
    <section aria-labelledby="why-look-heading">
      {/* benefits strip */}
      <div className="bg-surface">
        <div className="mx-auto grid w-full max-w-[1338px] grid-cols-1 gap-6 px-6 py-[22px] sm:grid-cols-2 lg:grid-cols-4 lg:gap-[25px] min-[1400px]:px-0">
          {benefits.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} variant="up" delay={i * 90} className="group flex items-center gap-[14px]">
              <span className="grid size-[52px] shrink-0 place-items-center rounded-full bg-white text-accent shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
                <Icon className="size-7" strokeWidth={1.6} aria-hidden />
              </span>
              <div>
                <p className="text-[18px] leading-6 font-medium text-black tracking-[-0.2px]">
                  {title}
                </p>
                <p className="text-[14px] leading-6 text-body tracking-[-0.15px]">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* essence block */}
      <div className="mx-auto w-full max-w-[1338px] px-6 py-[88px] min-[1400px]:px-0">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[497px_1fr] lg:gap-[120px]">
          {/* photo collage (Figma PictureTransition 1:6087) */}
          <Reveal variant="left" className="relative hidden h-[420px] lg:block">
            <div className="animate-float absolute top-[40px] left-0 w-[344px] border-4 border-line bg-white shadow-[0_0_1px_rgba(0,0,0,0.09)]">
              <img src={heroModel1} alt="LOOK model in kurta set" className="aspect-square w-full object-cover object-top" />
            </div>
            <div
              className="animate-float absolute top-[154px] left-[323px] w-[174px] border-4 border-line bg-white shadow-[-3px_4px_5px_rgba(0,0,0,0.09)]"
              style={{ animationDelay: "1.2s" }}
            >
              <img src={heroModel2} alt="" className="aspect-[597/903] w-full object-cover object-top" />
            </div>
          </Reveal>

          <Reveal variant="right" delay={120}>
            <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Why LOOK?</p>
            <h2
              id="why-look-heading"
              className="mt-3 max-w-[560px] font-display text-[35px] leading-[47px] font-medium text-heading-soft"
            >
              Luxury is not about exclusivity, it is about making every woman feel extraordinary.
            </h2>
            <p className="mt-5 max-w-[687px] text-[16px] leading-[26px] text-body">
              Every LOOK piece is thoughtfully crafted with premium quality, timeless design, and
              inclusive tailoring to celebrate every skin tone, every body shape, and every unique
              story.
            </p>
            <p className="mt-5 font-script text-[28px] leading-[1.25] text-accent-bright">
              Because confidence is the most beautiful thing you can wear.
            </p>
          </Reveal>
        </div>

        {/* value props with lavender check circles (Figma 2007:3571..3584 + 2007:3508) */}
        <div className="mt-[64px] grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-[87px]">
          {values.map(({ title, desc }, i) => (
            <Reveal key={title} variant="up" delay={i * 100} className="group flex flex-col gap-[14px]">
              <span className="flex size-[40px] items-center justify-center rounded-full bg-lavender transition-all duration-500 group-hover:scale-110 group-hover:bg-accent">
                <img src={iconCheck} alt="" className="size-[19px] transition group-hover:brightness-0 group-hover:invert" />
              </span>
              <p className="text-[20px] leading-[27px] text-black">{title}</p>
              <p className="text-[14px] leading-6 text-body tracking-[-0.15px]">{desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
