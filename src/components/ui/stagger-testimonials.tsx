import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SQRT_5000 = Math.sqrt(5000);

export interface Testimonial {
  id: string | number;
  quote: string;
  author: string;
  context?: string;
}

interface Internal extends Testimonial {
  tempId: number;
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

interface TestimonialCardProps {
  position: number;
  testimonial: Internal;
  handleMove: (steps: number) => void;
  cardSize: number;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({
  position,
  testimonial,
  handleMove,
  cardSize,
}) => {
  const isCenter = position === 0;
  const dist = Math.abs(position);
  // Depth by distance from centre: closer = brighter, larger, higher layer.
  // Extremes fade to near-zero so a card wrapping to the far side is invisible
  // as it appears (and gently fades out as it leaves) instead of hard-cutting.
  const opacity = dist === 0 ? 1 : dist === 1 ? 0.9 : dist === 2 ? 0.5 : 0.1;
  const scale = 1 - dist * 0.05;

  return (
    <div
      onClick={() => handleMove(position)}
      className={cn(
        "absolute top-1/2 left-1/2 cursor-pointer border-2 p-8 transition-all duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        isCenter
          ? "border-accent bg-accent text-white"
          : "border-line bg-card text-black hover:border-accent/50",
      )}
      style={{
        width: cardSize,
        height: cardSize,
        // Graded z-index (centre highest, fanning behind) so a card promoting to
        // centre only ever rises one layer at a time — no jarring pop to the front.
        zIndex: 30 - dist,
        opacity,
        // Ghost cards at the very edge shouldn't intercept clicks.
        pointerEvents: dist >= 3 ? "none" : "auto",
        clipPath: `polygon(50px 0%, calc(100% - 50px) 0%, 100% 50px, 100% 100%, calc(100% - 50px) 100%, 50px 100%, 0 100%, 0 0)`,
        transform: `
          translate(-50%, -50%)
          translateX(${(cardSize / 1.5) * position}px)
          translateY(${isCenter ? -65 : position % 2 ? 15 : -15}px)
          rotate(${isCenter ? 0 : position % 2 ? 2.5 : -2.5}deg)
          scale(${scale})
        `,
        boxShadow: isCenter ? "0px 8px 0px 4px var(--color-line)" : "0px 0px 0px 0px transparent",
      }}
    >
      <span
        className="absolute block origin-top-right rotate-45 bg-line"
        style={{ right: -2, top: 48, width: SQRT_5000, height: 2 }}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-3 right-6 font-display text-[64px] leading-none select-none",
          isCenter ? "text-white/25" : "text-accent/15",
        )}
      >
        &rdquo;
      </span>
      <div
        className={cn(
          "mb-4 flex h-14 w-12 items-center justify-center font-display text-[16px] font-semibold",
          isCenter ? "bg-white/90 text-accent" : "bg-lavender text-accent",
        )}
        style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.08)" }}
        aria-hidden
      >
        {initials(testimonial.author)}
      </div>
      <h3
        className={cn(
          "font-display text-lg leading-snug font-medium sm:text-[22px]",
          isCenter ? "text-white" : "text-black",
        )}
      >
        “{testimonial.quote}”
      </h3>
      <p
        className={cn(
          "absolute right-8 bottom-8 left-8 mt-2 text-sm italic",
          isCenter ? "text-white/80" : "text-muted",
        )}
      >
        — {testimonial.author}
        {testimonial.context ? `, ${testimonial.context}` : ""}
      </p>
    </div>
  );
};

export const StaggerTestimonials: React.FC<{ items: Testimonial[] }> = ({ items }) => {
  const [cardSize, setCardSize] = useState(365);
  const [list, setList] = useState<Internal[]>(() =>
    items.map((t, i) => ({ ...t, tempId: i })),
  );

  const paused = useRef(false);

  // Functional update keeps this stable for the auto-advance interval.
  const handleMove = useCallback((steps: number) => {
    setList((prev) => {
      const newList = [...prev];
      if (steps > 0) {
        for (let i = steps; i > 0; i--) {
          const item = newList.shift();
          if (!item) return prev;
          newList.push({ ...item, tempId: Math.random() });
        }
      } else {
        for (let i = steps; i < 0; i++) {
          const item = newList.pop();
          if (!item) return prev;
          newList.unshift({ ...item, tempId: Math.random() });
        }
      }
      return newList;
    });
  }, []);

  useEffect(() => {
    const updateSize = () => {
      const { matches } = window.matchMedia("(min-width: 640px)");
      setCardSize(matches ? 365 : 290);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Gentle auto-advance so the fan feels alive; pauses on hover/focus.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (!paused.current) handleMove(1);
    }, 5000);
    return () => window.clearInterval(id);
  }, [handleMove]);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 560 }}
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
      onFocusCapture={() => (paused.current = true)}
      onBlurCapture={() => (paused.current = false)}
    >
      {list.map((testimonial, index) => {
        // Center the fan around the middle card (symmetric for an odd count).
        const position = index - Math.floor(list.length / 2);
        return (
          <TestimonialCard
            key={testimonial.tempId}
            testimonial={testimonial}
            handleMove={handleMove}
            position={position}
            cardSize={cardSize}
          />
        );
      })}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        <button
          type="button"
          onClick={() => handleMove(-1)}
          className={cn(
            "flex h-14 w-14 items-center justify-center border-2 border-line bg-white text-2xl transition-colors",
            "hover:bg-accent hover:text-white",
            "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none",
          )}
          aria-label="Previous testimonial"
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          onClick={() => handleMove(1)}
          className={cn(
            "flex h-14 w-14 items-center justify-center border-2 border-line bg-white text-2xl transition-colors",
            "hover:bg-accent hover:text-white",
            "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none",
          )}
          aria-label="Next testimonial"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};
