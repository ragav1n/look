import { useState } from "react";

/* PDP gallery (Figma 1:1561): large main image + thumbnail strip.
   Remount per product (key on slug) resets the active thumbnail. */
export default function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0];

  return (
    <div>
      <div className="overflow-hidden rounded-img bg-card">
        {main && (
          <img src={main} alt={alt} className="aspect-[4/5] w-full object-cover object-top" />
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
              aria-current={i === active}
              className={`h-[84px] w-[68px] cursor-pointer overflow-hidden rounded-[6px] border-2 transition-colors ${
                i === active ? "border-accent" : "border-line hover:border-black"
              }`}
            >
              <img src={src} alt="" className="h-full w-full object-cover object-top" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
