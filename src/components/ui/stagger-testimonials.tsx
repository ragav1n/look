import React, { useEffect, useState } from "react";
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

  return (
    <div
      onClick={() => handleMove(position)}
      className={cn(
        "absolute top-1/2 left-1/2 cursor-pointer border-2 p-8 transition-all duration-500 ease-in-out",
        isCenter
          ? "z-10 border-accent bg-accent text-white"
          : "z-0 border-line bg-card text-black hover:border-accent/50",
      )}
      style={{
        width: cardSize,
        height: cardSize,
        clipPath: `polygon(50px 0%, calc(100% - 50px) 0%, 100% 50px, 100% 100%, calc(100% - 50px) 100%, 50px 100%, 0 100%, 0 0)`,
        transform: `
          translate(-50%, -50%)
          translateX(${(cardSize / 1.5) * position}px)
          translateY(${isCenter ? -65 : position % 2 ? 15 : -15}px)
          rotate(${isCenter ? 0 : position % 2 ? 2.5 : -2.5}deg)
        `,
        boxShadow: isCenter ? "0px 8px 0px 4px var(--color-line)" : "0px 0px 0px 0px transparent",
      }}
    >
      <span
        className="absolute block origin-top-right rotate-45 bg-line"
        style={{ right: -2, top: 48, width: SQRT_5000, height: 2 }}
      />
      <div
        className={cn(
          "mb-4 flex h-14 w-12 items-center justify-center text-[16px] font-medium",
          isCenter ? "bg-white/90 text-accent" : "bg-lavender text-accent",
        )}
        style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.08)" }}
        aria-hidden
      >
        {initials(testimonial.author)}
      </div>
      <h3 className={cn("text-base font-medium sm:text-xl", isCenter ? "text-white" : "text-black")}>
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

  const handleMove = (steps: number) => {
    const newList = [...list];
    if (steps > 0) {
      for (let i = steps; i > 0; i--) {
        const item = newList.shift();
        if (!item) return;
        newList.push({ ...item, tempId: Math.random() });
      }
    } else {
      for (let i = steps; i < 0; i++) {
        const item = newList.pop();
        if (!item) return;
        newList.unshift({ ...item, tempId: Math.random() });
      }
    }
    setList(newList);
  };

  useEffect(() => {
    const updateSize = () => {
      const { matches } = window.matchMedia("(min-width: 640px)");
      setCardSize(matches ? 365 : 290);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 560 }}>
      {list.map((testimonial, index) => {
        const position =
          list.length % 2 ? index - (list.length + 1) / 2 : index - list.length / 2;
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
