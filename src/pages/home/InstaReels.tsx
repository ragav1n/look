import heroModel1 from "@/assets/hero-model-1.jpg";
import heroModel2 from "@/assets/hero-model-2.jpg";
import kurtaFloral2 from "@/assets/kurta-floral-2.jpg";
import promoM6 from "@/assets/promo-m6.jpg";
import iconPlay from "@/assets/icon-essence-play.svg";
import Reveal from "@/components/ui/Reveal";

const IG_URL = "https://www.instagram.com/look_.in";

const reels = [
  { src: heroModel1, caption: "Festive fits, styled 3 ways" },
  { src: kurtaFloral2, caption: "Thread-work close-up" },
  { src: heroModel2, caption: "New drop: try-on haul" },
  { src: promoM6, caption: "Short kurta, long day" },
];

/* User-requested section (not in Figma): Instagram reels row in the design's
   visual language — eyebrow + Playfair heading, 9:16 cards, play affordance. */
export default function InstaReels() {
  return (
    <section className="py-[72px]" aria-labelledby="reels-heading">
      <div className="mx-auto w-full max-w-[1338px] px-6 min-[1400px]:px-0">
        <Reveal className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[12px] tracking-[0.08em] text-accent uppercase">@look_.in</p>
            <h2
              id="reels-heading"
              className="mt-2 font-display text-[35px] leading-[47px] font-medium text-black"
            >
              Straight From Our Reels
            </h2>
          </div>
          <a
            href={IG_URL}
            target="_blank"
            rel="noreferrer"
            className="group/link text-[16px] font-medium text-body transition-colors hover:text-accent"
          >
            Follow us on Instagram{" "}
            <span className="inline-block transition-transform duration-300 group-hover/link:translate-x-1">→</span>
          </a>
        </Reveal>

        <div className="mt-[44px] grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {reels.map(({ src, caption }, i) => (
            <Reveal key={caption} variant="up" delay={i * 90}>
            <a
              href={IG_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative block overflow-hidden rounded-card"
              aria-label={`Watch on Instagram: ${caption}`}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                className="aspect-[9/16] w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
              <span className="absolute top-3 right-3 flex size-[40px] items-center justify-center rounded-full bg-lavender/90 transition-transform duration-300 group-hover:scale-110">
                <img src={iconPlay} alt="" className="size-[18px]" />
              </span>
              <p className="absolute inset-x-4 bottom-4 text-[14px] leading-[20px] font-medium text-white">
                {caption}
              </p>
            </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
