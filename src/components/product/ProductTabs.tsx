import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Product, Review } from "@/types";
import RatingStars from "@/components/ui/RatingStars";
import { sanitizeHtml } from "@/lib/sanitize";

type TabKey = "description" | "reviews" | "returns";

/* PDP information tabs — Description / Reviews / Exchange & Returns.
   The three sections used to stack vertically; they're now a tabbed panel so
   the page reads shorter. Selecting a tab crossfades its panel in via the
   .animate-tab-panel utility (disabled under prefers-reduced-motion). Follows
   the WAI-ARIA tabs pattern: roving tabindex + arrow/Home/End key navigation.
   Black theme, single red accent underline. */
export default function ProductTabs({ product, reviews }: { product: Product; reviews: Review[] }) {
  const [active, setActive] = useState<TabKey>("description");
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Sanitize the store-authored description HTML once per product (see below).
  const safeDescription = useMemo(
    () => (product.descriptionHtml ? sanitizeHtml(product.descriptionHtml) : ""),
    [product.descriptionHtml],
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: "description", label: "Description" },
    { key: "reviews", label: `Reviews (${reviews.length})` },
    { key: "returns", label: "Exchange & Returns" },
  ];

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    let next: number;
    if (e.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    setActive(tabs[next].key);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className="mt-16 max-w-[820px]">
      <div role="tablist" aria-label="Product information" className="flex gap-1 border-b border-line">
        {tabs.map(({ key, label }, i) => {
          const selected = active === key;
          return (
            <button
              key={key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              type="button"
              id={`${baseId}-tab-${key}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(key)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative -mb-px cursor-pointer px-4 py-3 text-[15px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                selected ? "text-white" : "text-muted hover:text-white"
              }`}
            >
              {label}
              <span
                aria-hidden
                className={`absolute inset-x-0 -bottom-px h-[2px] origin-center rounded-full bg-accent transition-transform duration-300 ease-out ${
                  selected ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div
        key={active}
        role="tabpanel"
        id={`${baseId}-panel-${active}`}
        aria-labelledby={`${baseId}-tab-${active}`}
        tabIndex={0}
        /* min-height keeps a short panel (e.g. "Reviews (0)") from collapsing
           the page and yanking the section below it up on every tab switch */
        className="animate-tab-panel min-h-[240px] pt-6 focus-visible:outline-none"
      >
        {active === "description" &&
          /* Live products carry a rich HTML description (tables, lists) authored
             in Shopify — render it via .product-prose, which styles the markup
             for the black theme. It is sanitised with DOMPurify (@/lib/sanitize)
             before injection: the Storefront API does NOT strip scripts for us,
             and the CSP is the backstop. The dev fixtures have no HTML, so they
             fall back to the plain-text description + details paragraphs. */
          (safeDescription ? (
            <div
              className="product-prose"
              dangerouslySetInnerHTML={{ __html: safeDescription }}
            />
          ) : (
            <>
              <p className="text-[15px] leading-[25px] text-body">{product.description}</p>
              <h3 className="mt-6 text-[17px] font-medium text-white">{product.details.title}</h3>
              {product.details.body.map((p, i) => (
                <p key={i} className="mt-3 text-[15px] leading-[25px] text-body">
                  {p}
                </p>
              ))}
            </>
          ))}

        {active === "reviews" && (
          <div className="flex flex-col gap-6">
            {reviews.length === 0 ? (
              <p className="text-[15px] text-body">
                No reviews yet — be the first to share your thoughts.
              </p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="border-b border-line pb-6 last:border-0">
                  <div className="flex items-center gap-3">
                    <RatingStars rating={r.rating} size={16} />
                    <span className="text-[14px] font-medium text-white">{r.title}</span>
                  </div>
                  <p className="mt-2 text-[15px] leading-[24px] text-body">{r.body}</p>
                  <p className="mt-2 text-[13px] text-muted">
                    {r.author}
                    {r.verified && <span className="ml-2 text-accent">✓ Verified buyer</span>}
                    <span className="ml-2 text-faint">{r.date}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {active === "returns" && (
          <div className="flex flex-col gap-3 text-[15px] leading-[25px] text-body">
            <p>
              We accept returns and exchanges for eligible products within our return policy period,
              provided the item is unused, unwashed, and in its original condition with all tags
              intact.
            </p>
            <p>
              Orders are usually processed within 3–6 business days, and delivery timelines may vary
              depending on your location. To start a return or exchange, please reach out to our
              support team and we’ll be happy to help.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
