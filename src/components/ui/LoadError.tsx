import { RotateCw } from "lucide-react";

/**
 * Shown when a catalog fetch throws, so an outage doesn't masquerade as an
 * empty result. Without this a revoked token rendered "No products found — try
 * a different filter combination", blaming the shopper's filters for the shop
 * being down, with no way to retry.
 */
export default function LoadError({
  title = "We couldn't load this",
  message = "Something went wrong reaching the store. It's usually temporary.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Connection problem</p>
      <p className="text-[18px] font-medium text-white">{title}</p>
      <p className="max-w-[420px] text-[15px] text-body">{message}</p>
      <button
        type="button"
        onClick={onRetry ?? (() => window.location.reload())}
        className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-btn border border-line px-5 py-3 text-[14px] font-medium text-white transition-colors hover:border-accent hover:text-accent"
      >
        <RotateCw className="size-4" />
        Try again
      </button>
    </div>
  );
}
