import { useEffect, useState } from "react";
import { AlertCircle, Check, X } from "lucide-react";
import { useToast, type ToastMessage } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

/* Bottom-right toast stack. Sits above Modal (z-50) so a cart error raised from
   inside Quick View is still visible. Black surface + the single red accent —
   no new palette. */

const DISMISS_MS = 4500;

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const isError = toast.tone === "error";

  // Hovering (or focusing) holds the toast open so a long message is readable.
  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(() => onDismiss(toast.id), DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [paused, toast.id, onDismiss]);

  const Icon = isError ? AlertCircle : Check;

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "animate-toast pointer-events-auto flex w-full items-start gap-3 rounded-[10px] border bg-surface px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:w-[360px]",
        isError ? "border-accent/45" : "border-line",
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", isError ? "text-accent" : "text-white")} />
      <p className="flex-1 text-[14px] leading-snug text-body">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-mr-1 -mt-0.5 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export default function ToastViewport() {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}
