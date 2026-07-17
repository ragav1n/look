import { useEffect, useRef, useState, type ReactNode } from "react";

type Variant = "up" | "fade" | "scale" | "left" | "right";

interface Props {
  children: ReactNode;
  className?: string;
  /** Entrance direction/style. Default "up". */
  variant?: Variant;
  /** Stagger delay in ms (applied once the element is revealed). */
  delay?: number;
  /** Fraction of the element that must be visible before revealing (0–1). */
  amount?: number;
  /** Re-hide + replay when it scrolls back out of view. Default false (reveal once). */
  replay?: boolean;
}

/* Scroll-reveal wrapper: fades + eases its child into place when it enters the
   viewport. Pairs with the [data-reveal] transitions in index.css. Honours
   prefers-reduced-motion by showing content immediately. One IntersectionObserver
   per instance — cheap for the handful of blocks we animate per page. */
export default function Reveal({
  children,
  className,
  variant = "up",
  delay = 0,
  amount = 0.15,
  replay = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    // Already scrolled past at mount (reload with restored scroll) → show now,
    // no need to observe. In-view + below-fold elements fall through to the
    // observer so they still animate in.
    if (el.getBoundingClientRect().bottom < 0) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            if (!replay) io.unobserve(entry.target);
          } else if (
            !replay &&
            entry.rootBounds &&
            entry.boundingClientRect.top < entry.rootBounds.top
          ) {
            // Already scrolled past (e.g. reload with restored scroll, or a fast
            // jump) — show it straight away so content is never stuck hidden.
            setShown(true);
            io.unobserve(entry.target);
          } else if (replay) {
            setShown(false);
          }
        }
      },
      { threshold: amount, rootMargin: "0px 0px -8% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [amount, replay]);

  return (
    <div
      ref={ref}
      data-reveal={variant}
      data-shown={shown ? "true" : "false"}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={className}
    >
      {children}
    </div>
  );
}
