import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import collDress from "@/assets/product-22.jpg";
import collTops from "@/assets/product-24.jpg";
import collCoords from "@/assets/product-23.jpg";
import collNew from "@/assets/product-17.jpg";

/* "LOOK Collections" — image-led category cards showcasing what the store
   carries. Layout is inspired by the client's reference (four tall cards with
   the category name set low-left) but built in LOOK's own black/red language. */
const collections = [
  { label: "Dresses", image: collDress, to: "/shop?col=dresses" },
  { label: "Tops", image: collTops, to: "/shop?col=tops" },
  { label: "Co-Ords", image: collCoords, to: "/shop?col=co-ords" },
  { label: "New Arrivals", image: collNew, to: "/shop?col=new-arrivals" },
];

export default function LookCollections() {
  return (
    <section className="py-[72px]" aria-labelledby="collections-heading">
      <div className="mx-auto w-full max-w-[1338px] px-6 min-[1400px]:px-0">
        <Reveal className="text-center">
          <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Explore</p>
          <h2
            id="collections-heading"
            className="mt-2 font-display text-[35px] leading-[47px] font-medium text-white"
          >
            LOOK Collections
          </h2>
          <p className="mt-2 text-[16px] text-body">Shop by collection.</p>
        </Reveal>

        <div className="mt-[44px] grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
          {collections.map(({ label, image, to }, i) => (
            <Reveal key={label} variant="up" delay={i * 90}>
              <Link
                to={to}
                aria-label={`Shop ${label}`}
                className="group relative block overflow-hidden rounded-card border border-white/5"
              >
                <img
                  src={image}
                  alt={label}
                  loading="lazy"
                  className="aspect-[3/4] w-full object-cover object-top transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                />
                {/* legibility gradient + subtle red wash on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
                <div className="absolute inset-0 bg-accent/0 transition-colors duration-500 group-hover:bg-accent/15" />

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                  <div>
                    <span className="block h-[2px] w-8 bg-accent transition-all duration-500 group-hover:w-12" />
                    <h3 className="mt-3 font-display text-[20px] leading-tight font-medium text-white lg:text-[22px]">
                      {label}
                    </h3>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors duration-300 group-hover:bg-accent">
                    <ArrowUpRight className="size-[18px]" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
