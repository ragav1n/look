import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import ToastViewport from "@/components/ui/Toast";

/**
 * Transient messages for things the user can't otherwise see: a cart mutation
 * that failed, or a `userErrors` notice the Storefront API returned alongside
 * an otherwise-successful mutation. Nothing here is a substitute for an inline
 * error on a form — this is for actions whose failure would be invisible.
 */

export type ToastTone = "error" | "success";

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

/** Cap the stack so a loop of failures can't paper over the page. */
const MAX_VISIBLE = 3;

interface ToastContextValue {
  toasts: ToastMessage[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message: string, tone: ToastTone = "error") => {
    // Read the id outside the updater so StrictMode's double-invoke can't
    // burn two ids for one toast.
    const id = nextId.current++;
    setToasts((prev) => {
      // A button the user is jabbing at shouldn't stack identical errors.
      if (prev.some((t) => t.message === message && t.tone === tone)) return prev;
      return [...prev, { id, message, tone }].slice(-MAX_VISIBLE);
    });
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, push, dismiss }),
    [toasts, push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
