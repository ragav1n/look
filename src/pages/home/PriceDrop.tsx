import { Link } from "react-router-dom";
import { getSaleProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { useAsyncData } from "@/hooks/useAsyncData";
import Skeleton from "@/components/ui/Skeleton";

/* Figma promo cards (2007:3587): 518x250 surface cards, "Up to N% off" with
   red percentage, 26px title, black Shop Now, 159px circular photo.
   Data-driven: shows products Shopify reports on sale (compareAtPrice > price);
   the % is derived from Shopify's own compare-at, not a discount we invent. */
export default function PriceDrop() {
  const { data, loading } = useAsyncData(() => getSaleProducts(), []);
  const promos = (data ?? []).slice(0, 2);

  // Nothing on sale in Shopify → hide the section entirely.
  if (!loading && promos.length === 0) return null;

  return (
    <section className="py-[72px]" aria-labelledby="price-drop-heading">
      <div className="mx-auto w-full max-w-[1338px] px-6 min-[1400px]:px-0">
        <div className="text-center">
          <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Limited Time</p>
          <h2
            id="price-drop-heading"
            className="mt-2 font-display text-[35px] leading-[47px] font-medium text-black"
          >
            Price Drop!
          </h2>
        </div>

        <div className="mx-auto mt-[44px] flex max-w-[1071px] flex-col justify-center gap-[35px] lg:flex-row">
          {loading &&
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-[250px] w-full max-w-[518px] rounded-card" />
            ))}
          {!loading &&
            promos.map((p) => {
              const percent = p.mrp ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
              return (
                <div
                  key={p.id}
                  className="relative h-[250px] w-full max-w-[518px] shrink-0 rounded-card bg-surface"
                >
                  <div className="flex h-full flex-col justify-center pl-[47px]">
                    <p className="text-[16px] text-body">
                      Up to <span className="text-[24px] text-sale">{percent}%</span> off
                    </p>
                    <p className="mt-1 text-[26px] leading-tight font-medium text-heading-soft">
                      {p.name}
                    </p>
                    <p className="mt-1 text-[14px] text-muted">
                      Now from{" "}
                      <span className="font-medium text-accent">
                        {formatPrice(p.price, p.currencyCode)}
                      </span>
                    </p>
                    <Link
                      to={`/shop/${p.slug}`}
                      className="mt-4 inline-flex w-fit items-center justify-center rounded-btn bg-black px-4 py-2.5 font-ui text-[14px] leading-5 font-medium text-white shadow-xs transition-opacity hover:opacity-85"
                    >
                      Shop Now
                    </Link>
                  </div>
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    loading="lazy"
                    className="absolute top-[50px] right-[26px] hidden size-[159px] rounded-full object-cover object-top sm:block"
                  />
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
}
