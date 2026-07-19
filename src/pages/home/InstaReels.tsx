import iconPlay from "@/assets/icon-essence-play.svg";
import Reveal from "@/components/ui/Reveal";
import { site } from "@/config/site";
import { getReels } from "@/lib/catalog";
import { useAsyncData } from "@/hooks/useAsyncData";

/* User-requested section (not in Figma): Instagram reels row in the design's
   visual language — eyebrow + Playfair heading, 9:16 cards, play affordance.
   Cards are driven by the `reel` metaobject in Shopify, so each links to its
   own Instagram post. The section hides entirely when the store has none. */
export default function InstaReels() {
  const { data: reels } = useAsyncData(() => getReels(12), []);

  if (!reels?.length) return null;

  return (
    <section className="py-[72px]" aria-labelledby="reels-heading">
      <div className="mx-auto w-full max-w-[1338px] px-6 min-[1400px]:px-0">
        <Reveal className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[12px] tracking-[0.08em] text-accent uppercase">
              {site.instagramHandle}
            </p>
            <h2
              id="reels-heading"
              className="mt-2 font-display text-[35px] leading-[47px] font-medium text-white"
            >
              Straight From Our Reels
            </h2>
          </div>
          <a
            href={site.instagram}
            target="_blank"
            rel="noreferrer"
            className="group/link text-[16px] font-medium text-body transition-colors hover:text-accent"
          >
            Follow us on Instagram{" "}
            <span className="inline-block transition-transform duration-300 group-hover/link:translate-x-1">→</span>
          </a>
        </Reveal>

        <div className="mt-[44px] grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {reels.map((reel, i) => (
            <Reveal key={reel.id} variant="up" delay={i * 90}>
            <a
              href={reel.link}
              target="_blank"
              rel="noreferrer"
              className="group relative block overflow-hidden rounded-card"
              aria-label={reel.caption ? `Watch on Instagram: ${reel.caption}` : "Watch on Instagram"}
            >
              <img
                src={reel.image}
                alt={reel.imageAlt}
                loading="lazy"
                className="aspect-[9/16] w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
              <span className="absolute top-3 right-3 flex size-[40px] items-center justify-center rounded-full bg-accent-tint/90 transition-transform duration-300 group-hover:scale-110">
                <img src={iconPlay} alt="" className="size-[18px]" />
              </span>
              {reel.caption && (
                <p className="absolute inset-x-4 bottom-4 text-[14px] leading-[20px] font-medium text-white">
                  {reel.caption}
                </p>
              )}
            </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
