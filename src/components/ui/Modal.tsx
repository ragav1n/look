import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, label, children, maxWidth = "max-w-[820px]" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Whether the current click started on the backdrop (see the close handler).
  const backdropDownRef = useRef(false);

  // Focus management: lock scroll, move focus into the dialog on open, and
  // restore it to the trigger on close. Keyed on `open` only so an unstable
  // onClose prop can't re-run this and steal focus while the dialog is open.
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

  // Escape to close + trap Tab within the dialog.
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  /* Close only on a click that both starts AND ends on the backdrop. A `click`
     fires on the nearest common ancestor of mousedown and mouseup, so a drag
     that begins inside the panel (selecting the description, the size chart)
     and releases on the dark area used to dispatch click on the backdrop and
     close the dialog, discarding the user's selection. Guard on mousedown. */
  return createPortal(
    <div
      className="animate-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        backdropDownRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && backdropDownRef.current) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`animate-modal-panel relative max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-card border border-line bg-surface shadow-[0px_24px_60px_rgba(0,0,0,0.6)] outline-none`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
