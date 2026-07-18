/** Neutral loading placeholder — pulses in the design's card language. */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-white/[0.06] ${className}`} aria-hidden />;
}
