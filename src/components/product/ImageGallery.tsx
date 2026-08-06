import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { useToast } from "@/context/ToastContext";
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

/** Past this many px a touch counts as a swipe rather than a tap-to-zoom. */
const SWIPE_PX = 40;

/* PDP gallery (Figma 1:1561): large main image + thumbnail strip.
   Prev/next arrows over the main image, and click-to-open a full-screen
   lightbox. Remount per product (key on slug) resets the active thumbnail. */
export default function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const { push } = useToast();
  const main = images[active] ?? images[0];
  const many = images.length > 1;
  const go = (delta: number) => setActive((i) => (i + delta + images.length) % images.length);

  /* The strip is one scrolling row on a phone, so the thumbnail for the image
     you're looking at can sit off-screen after an arrow press or a swipe.
     Scroll the strip itself rather than calling scrollIntoView, which would
     drag the whole page down to the strip on first paint. */
  useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.children[active] as HTMLElement | undefined;
    if (!strip || !el) return;

    const PEEK = 12;
    const left = el.offsetLeft;
    const right = left + el.offsetWidth;
    if (left < strip.scrollLeft) {
      strip.scrollTo({ left: left - PEEK, behavior: "smooth" });
    } else if (right > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: right - strip.clientWidth + PEEK, behavior: "smooth" });
    }
  }, [active]);

  /* Sharing a piece you like is how this shop travels, so put it on the image
     rather than behind a menu. The native sheet is the good path; where there
     isn't one (most desktop browsers) copying the link is the honest fallback. */
  const share = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: alt, url });
        return;
      } catch (err) {
        // Dismissing the sheet lands here too — that isn't a failure.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      push("Link copied", "success");
    } catch {
      push("Couldn't copy the link. You can copy it from the address bar.");
    }
  };

  return (
    <div>
      <div className="group relative overflow-hidden rounded-img bg-card">
        {main && (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            onTouchStart={(e) => {
              touchX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              const start = touchX.current;
              touchX.current = null;
              const end = e.changedTouches[0]?.clientX;
              if (start == null || end == null || !many) return;
              const dx = end - start;
              if (Math.abs(dx) >= SWIPE_PX) go(dx < 0 ? 1 : -1);
            }}
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

        <button
          type="button"
          onClick={share}
          aria-label={`Share ${alt}`}
          className="absolute top-3 right-3 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
        >
          <Share2 className="size-[18px]" strokeWidth={1.8} />
        </button>

        {many && (
          <>
            {/* Swipe is additive: the arrows stay for pointers, including a
                mouse in a window narrow enough to miss the touch path. */}
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
            <span className="absolute right-3 bottom-3 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-sm sm:hidden">
              {active + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {many && (
        <div
          ref={stripRef}
          className="no-scrollbar mt-4 flex gap-2.5 overflow-x-auto sm:flex-wrap sm:gap-3 sm:overflow-visible"
        >
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
              aria-current={i === active}
              className={`h-[72px] w-[58px] shrink-0 cursor-pointer overflow-hidden rounded-[6px] border-2 transition-colors sm:h-[84px] sm:w-[68px] ${
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
