import { useId, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Product, Review } from "@/types";
import RatingStars from "@/components/ui/RatingStars";
import ImageLightbox from "@/components/product/ImageLightbox";
import { cdnResize } from "@/lib/reviews";
import { sanitizeHtml } from "@/lib/sanitize";

type SectionKey = "description" | "reviews" | "returns";

/* PDP information sections — Description / Reviews / Exchange & Returns.
   These were a tabbed panel, which meant the description sat open on the page
   by default; they're now collapsed disclosures so the page reads shorter and
   the customer opens only what they want. One panel open at a time, matching
   the home FAQ accordion. Panels stay in the DOM while collapsed (grid-rows
   0fr → 1fr) so the description is still crawlable. Black theme, single red
   accent on the chevron. */
export default function ProductAccordion({
  product,
  reviews,
  onWriteReview,
}: {
  product: Product;
  reviews: Review[];
  /** Shown only when this visitor may actually review the piece — the page
   *  works that out, so the button is simply absent for everyone else. The form
   *  itself stays in ProductDetail; this only asks for it. */
  onWriteReview?: () => void;
}) {
  const [open, setOpen] = useState<SectionKey | null>(null);
  const baseId = useId();

  /* Review photos, flattened across reviews so the lightbox can page through
     all of them the way the product gallery does. */
  const photos = useMemo(() => reviews.flatMap((r) => r.photos ?? []), [reviews]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  // Sanitize the store-authored description HTML once per product (see below).
  const safeDescription = useMemo(
    () => (product.descriptionHtml ? sanitizeHtml(product.descriptionHtml) : ""),
    [product.descriptionHtml],
  );

  const sections: { key: SectionKey; label: string; body: React.ReactNode }[] = [
    {
      key: "description",
      label: "Description",
      body:
        /* Live products carry a rich HTML description (tables, lists) authored
           in Shopify — render it via .product-prose, which styles the markup
           for the black theme. It is sanitised with DOMPurify (@/lib/sanitize)
           before injection: the Storefront API does NOT strip scripts for us,
           and the CSP is the backstop. The dev fixtures have no HTML, so they
           fall back to the plain-text description + details paragraphs. */
        safeDescription ? (
          <div className="product-prose" dangerouslySetInnerHTML={{ __html: safeDescription }} />
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
        ),
    },
    {
      key: "reviews",
      label: `Reviews (${reviews.length})`,
      body: (
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
                {r.photos && r.photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.photos.map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setLightbox(photos.indexOf(src))}
                        aria-label={`Open ${r.author}'s photo full size`}
                        className="cursor-pointer overflow-hidden rounded-btn transition-opacity hover:opacity-85"
                      >
                        {/* One 1200px file is stored per photo; the CDN makes
                            this one. The lightbox asks for the full size. */}
                        <img
                          src={cdnResize(src, 240)}
                          alt=""
                          loading="lazy"
                          className="size-[84px] object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[13px] text-muted">
                  {r.author}
                  {r.verified && <span className="ml-2 text-accent">✓ Verified buyer</span>}
                  <span className="ml-2 text-faint">{r.date}</span>
                </p>
              </div>
            ))
          )}

          {onWriteReview && (
            <button
              type="button"
              onClick={onWriteReview}
              className="inline-flex h-[46px] cursor-pointer items-center justify-center self-start rounded-btn border border-line px-6 text-[14px] font-medium text-body transition-colors hover:border-line-strong hover:text-white"
            >
              Write a review
            </button>
          )}
        </div>
      ),
    },
    {
      key: "returns",
      label: "Exchange & Returns",
      body: (
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
      ),
    },
  ];

  return (
    <section className="mt-16 max-w-[820px] border-t border-line" aria-label="Product information">
      {sections.map(({ key, label, body }) => {
        const isOpen = open === key;
        return (
          <div key={key} className="border-b border-line">
            <h2 className="m-0">
              <button
                type="button"
                id={`${baseId}-btn-${key}`}
                aria-expanded={isOpen}
                aria-controls={`${baseId}-panel-${key}`}
                onClick={() => setOpen(isOpen ? null : key)}
                className="group flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <span
                  className={`text-[16px] leading-[24px] font-medium transition-colors group-hover:text-white motion-reduce:transition-none ${
                    isOpen ? "text-white" : "text-body"
                  }`}
                >
                  {label}
                </span>
                <ChevronRight
                  aria-hidden
                  strokeWidth={1.6}
                  className={`size-5 shrink-0 transition-transform duration-300 ease-out motion-reduce:transition-none ${
                    isOpen ? "rotate-90 text-accent" : "text-muted group-hover:text-body"
                  }`}
                />
              </button>
            </h2>
            <div
              id={`${baseId}-panel-${key}`}
              role="region"
              aria-labelledby={`${baseId}-btn-${key}`}
              /* `invisible` while collapsed, not just zero-height: clipping with
                 overflow alone leaves every word in the accessibility tree and
                 in find-in-page, so a screen reader would read all three
                 sections aloud under buttons that say aria-expanded="false" —
                 the opposite of collapsing them. Visibility is a transitioned
                 property here, so it holds `visible` for the length of the
                 close before flipping, and the content stays in the DOM either
                 way for crawlers. */
              className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pb-6">{body}</div>
              </div>
            </div>
          </div>
        );
      })}

      {/* The same viewer the product gallery uses — its props are a direct fit,
          so review photos get arrow-key paging and a thumbnail rail for free. */}
      <ImageLightbox
        images={photos}
        alt={`Customer photos of ${product.name}`}
        index={lightbox ?? 0}
        open={lightbox !== null}
        onIndex={setLightbox}
        onClose={() => setLightbox(null)}
      />
    </section>
  );
}
