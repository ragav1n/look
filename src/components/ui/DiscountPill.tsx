interface Props {
  percent: number;
  variant?: "overlay" | "inline";
  className?: string;
}

/* Single source of truth for the "% off" chip. `overlay` = solid accent for use
   over product imagery (cards, rails, carousels); `inline` = soft sale tint for
   dark panels (PDP, quick view). Renders nothing below 1% so a thin markdown
   that rounds to 0% stays silent. Positioning is passed via className because
   each surface anchors the pill differently. */
export default function DiscountPill({ percent, variant = "overlay", className = "" }: Props) {
  if (percent <= 0) return null;
  return variant === "overlay" ? (
    <span
      className={`inline-flex h-[18px] items-center rounded-btn border border-accent bg-accent px-2.5 font-ui text-[12px] font-medium text-white shadow-xs ${className}`}
    >
      {percent}% OFF
    </span>
  ) : (
    <span
      className={`rounded-full bg-sale/15 px-2 py-1 text-[13px] font-medium text-sale ${className}`}
    >
      {percent}% off
    </span>
  );
}
