import { Link } from "react-router-dom";
import { getNewArrivals } from "@/lib/catalog";
import { useAsyncData } from "@/hooks/useAsyncData";
import Skeleton from "@/components/ui/Skeleton";

/* Figma "Discover Our Latest Collection" (2007:3640): full-bleed soft backdrop,
   heading left / paragraph right, 3 image cards with white captions */
export default function NewArrivals() {
  const { data, loading } = useAsyncData(() => getNewArrivals(), []);
  const items = (data ?? []).slice(0, 3);

  return (
    <section className="bg-[#efe7dc]/45 py-[72px]" aria-labelledby="new-arrivals-heading">
      <div className="mx-auto w-full max-w-[1338px] px-6 min-[1400px]:px-0">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[432px]">
            <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Latest Collection</p>
            <h2
              id="new-arrivals-heading"
              className="mt-2 font-display text-[35px] leading-[47px] font-medium text-black"
            >
              Discover Our Latest Collection
            </h2>
          </div>
          <p className="max-w-[645px] text-[16px] leading-[22px] text-body">
            Discover a curated collection of modern western wear designed for comfort, confidence,
            and everyday elegance. Explore timeless essentials and trendy styles that elevate your
            wardrobe.
          </p>
        </div>

        <div className="mt-[56px] grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-[100px]">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[373/422] w-full rounded-img" />
            ))}
          {!loading &&
            items.map((p) => (
            <Link
              key={p.id}
              to={`/shop/${p.slug}`}
              className="group relative block overflow-hidden rounded-img"
            >
              <img
                src={p.images[0]}
                alt={p.name}
                loading="lazy"
                className="aspect-[373/422] w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.05]"
              />
              <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/65 to-transparent" />
              <div className="absolute bottom-[18px] left-[22px]">
                <p className="text-[18px] leading-[22px] font-medium text-white">New Arrivals</p>
                <p className="text-[14px] leading-[22px] text-white/90">{p.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
