import { useState } from "react";
import ImageLightbox from "./ImageLightbox";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* PDP gallery (Figma 1:1561): large main image + thumbnail strip.
   Prev/next arrows over the main image, and click-to-open a full-screen
   lightbox. Remount per product (key on slug) resets the active thumbnail. */
export default function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const main = images[active] ?? images[0];
  const many = images.length > 1;
  const go = (delta: number) => setActive((i) => (i + delta + images.length) % images.length);

  return (
    <div>
      <div className="group relative overflow-hidden rounded-img bg-card">
        {main && (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label="Open image viewer"
            className="block w-full cursor-zoom-in"
          >
            <img
              key={active}
              src={main}
              alt={alt}
              className="animate-gallery-fade aspect-[4/5] w-full object-cover object-top"
            />
          </button>
        )}
        {many && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
            >
              <Chevron dir="right" />
            </button>
          </>
        )}
      </div>

      {many && (
        <div className="mt-4 flex flex-wrap gap-3">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
              aria-current={i === active}
              className={`h-[84px] w-[68px] cursor-pointer overflow-hidden rounded-[6px] border-2 transition-colors ${
                i === active ? "border-accent" : "border-line hover:border-line-strong"
              }`}
            >
              <img src={src} alt="" className="h-full w-full object-cover object-top" />
            </button>
          ))}
        </div>
      )}

      <ImageLightbox
        images={images}
        alt={alt}
        index={active}
        open={zoomed}
        onIndex={setActive}
        onClose={() => setZoomed(false)}
      />
    </div>
  );
}
