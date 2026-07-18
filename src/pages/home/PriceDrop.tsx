import { Link } from "react-router-dom";
import { getSaleProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { useAsyncData } from "@/hooks/useAsyncData";
import Skeleton from "@/components/ui/Skeleton";
import Reveal from "@/components/ui/Reveal";

/* Price Drop — data-driven from products Shopify reports on sale
   (compareAtPrice > price). Each card shows just the essentials the client
   asked for: image, name, original price (struck through) and the discounted
   price. No EMI / monthly-payment clutter. */
export default function PriceDrop() {
  const { data, loading } = useAsyncData(() => getSaleProducts(), []);
  const promos = (data ?? []).slice(0, 4);

  // Nothing on sale in Shopify → hide the section entirely.
  if (!loading && promos.length === 0) return null;

  return (
    <section className="py-[72px]" aria-labelledby="price-drop-heading">
      <div className="mx-auto w-full max-w-[1338px] px-6 min-[1400px]:px-0">
        <Reveal className="text-center">
          <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Limited Time</p>
          <h2
            id="price-drop-heading"
            className="mt-2 font-display text-[35px] leading-[47px] font-medium text-white"
          >
            Price Drop!
          </h2>
          <p className="mt-2 text-[16px] text-body">Loved pieces, now at a lower price.</p>
        </Reveal>

        <div className="mt-[44px] grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="aspect-[3/4] w-full rounded-card" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            ))}

          {!loading &&
            promos.map((p, i) => {
              const percent = p.mrp ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
              return (
                <Reveal key={p.id} variant="up" delay={i * 90}>
                  <Link
                    to={`/shop/${p.slug}`}
                    aria-label={p.name}
                    className="group flex flex-col"
                  >
                    <div className="relative overflow-hidden rounded-card border border-white/5 bg-card">
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        loading="lazy"
                        className="aspect-[3/4] w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                      />
                      {percent > 0 && (
                        <span className="absolute top-3 left-3 rounded-full bg-accent px-2.5 py-1 font-ui text-[11px] font-semibold tracking-[0.02em] text-white">
                          {percent}% OFF
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-[16px] leading-[22px] font-medium text-white group-hover:text-accent">
                      {p.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      {p.mrp && (
                        <span className="text-[14px] text-muted line-through">
                          {formatPrice(p.mrp, p.currencyCode)}
                        </span>
                      )}
                      <span className="text-[16px] font-semibold text-white">
                        {formatPrice(p.price, p.currencyCode)}
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
        </div>
      </div>
    </section>
  );
}
