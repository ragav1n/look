import { useId } from "react";
import starFull from "@/assets/pdp-star-full.svg";
import starEmpty from "@/assets/pdp-star-empty.svg";

/**
 * Pick a rating, 1 to 5.
 *
 * Not a variant of RatingStars: that one is `role="img"` with a single label,
 * which is right for DISPLAYING a rating and useless for choosing one. This is a
 * real radio group, so it arrows between options, announces "3 of 5 stars", and
 * submits with the keyboard — none of which a row of clickable images does.
 *
 * Whole stars only. Half steps are stored and displayed (an average lands on
 * them, and the hand-written fixtures use them), but asking a customer to hit a
 * half-star target on a phone is a worse form than it is a better rating.
 */
export default function RatingInput({
  value,
  onChange,
  name,
  size = 30,
}: {
  value: number;
  onChange: (rating: number) => void;
  /** Radio group name; defaults to a generated one so two can share a page. */
  name?: string;
  size?: number;
}) {
  const auto = useId();
  const group = name ?? auto;

  return (
    <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <label
          key={n}
          className="cursor-pointer p-0.5 transition-transform hover:scale-110 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent"
        >
          <input
            type="radio"
            name={group}
            value={n}
            checked={value === n}
            onChange={() => onChange(n)}
            className="sr-only"
          />
          <img
            src={value >= n ? starFull : starEmpty}
            alt=""
            style={{ width: size, height: size }}
            className="shrink-0"
          />
          <span className="sr-only">
            {n} {n === 1 ? "star" : "stars"}
          </span>
        </label>
      ))}
      <span className="ml-2 text-[13px] text-muted">
        {value ? `${value} of 5` : "Tap to rate"}
      </span>
    </div>
  );
}
