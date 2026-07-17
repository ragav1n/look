import starFull from "@/assets/pdp-star-full.svg";
import starHalf from "@/assets/pdp-star-half.svg";
import starEmpty from "@/assets/pdp-star-empty.svg";

export default function RatingStars({
  rating,
  size = 24,
  className = "",
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (rating >= i + 1) return starFull;
    if (rating >= i + 0.5) return starHalf;
    return starEmpty;
  });
  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      role="img"
      aria-label={`Rated ${rating} out of 5`}
    >
      {stars.map((src, i) => (
        <img key={i} src={src} alt="" style={{ width: size, height: size }} />
      ))}
    </div>
  );
}
