import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/* Full-screen product image viewer ("pop out"). Opened from ImageGallery.
   Mirrors the a11y patterns in ui/Modal (scroll lock, focus, Esc, backdrop
   click) and adds Left/Right arrow-key navigation plus a thumbnail rail. */
interface Props {
  images: string[];
  alt: string;
  index: number;
  open: boolean;
  onIndex: (i: number) => void;
  onClose: () => void;
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

export default function ImageLightbox({ images, alt, index, open, onIndex, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const count = images.length;
  const go = (delta: number) => onIndex((index + delta + count) % count);

  // Lock scroll + restore focus to the trigger on close. Keyed on `open` only.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [open]);

  // Esc closes; Left/Right navigate.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (!open) return null;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} — image viewer`}
      tabIndex={-1}
      className="animate-modal-backdrop fixed inset-0 z-[60] flex flex-col bg-black/95 outline-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* top bar: counter + close */}
      <div className="flex items-center justify-between px-5 py-4 text-white">
        <span className="text-[13px] tabular-nums text-white/70">
          {index + 1} / {count}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close image viewer"
          className="flex size-10 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* stage: arrows + big image */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {count > 1 && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous image"
            className="absolute left-2 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:left-4"
          >
            <Chevron dir="left" />
          </button>
        )}
        <img
          src={images[index]}
          alt={`${alt} — image ${index + 1}`}
          className="max-h-full max-w-full object-contain"
        />
        {count > 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next image"
            className="absolute right-2 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:right-4"
          >
            <Chevron dir="right" />
          </button>
        )}
      </div>

      {/* thumbnail rail */}
      {count > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto px-4 py-4">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => onIndex(i)}
              aria-label={`View image ${i + 1} of ${count}`}
              aria-current={i === index}
              className={`h-[64px] w-[52px] shrink-0 overflow-hidden rounded-[6px] border-2 transition-colors ${
                i === index ? "border-accent" : "border-white/20 hover:border-white/50"
              }`}
            >
              <img src={src} alt="" className="h-full w-full object-cover object-top" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
