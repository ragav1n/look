import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import NewsletterForm from "@/components/NewsletterForm";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useUser } from "@/context/UserProvider";

/** How long a visitor lingers before we invite them to subscribe. */
const DELAY_MS = 15_000;

/* Site-wide newsletter invite: the same capture as the home band, surfaced as a
   modal after the visitor has spent a little time on the site. Shown at most
   once per browser (a dismissal or a subscribe both retire it), and never to a
   signed-in customer — they're likely already on the list. Mounted once in
   PageShell. */
export default function NewsletterPopup() {
  const { ready, isAuthenticated } = useUser();
  const [prompt, setPrompt] = useLocalStorage("look.newsletterPrompt", { seen: false });
  const [open, setOpen] = useState(false);

  const suppressed = prompt.seen || isAuthenticated;

  // Arm the timer only once the session is known (avoids briefly counting down
  // for a logged-in customer whose session is still hydrating) and only if we
  // haven't already shown it. Cleared on unmount / dependency change.
  useEffect(() => {
    if (!ready || suppressed) return;
    const t = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(t);
  }, [ready, suppressed]);

  // Retire the prompt for good, then close.
  const retire = () => {
    setPrompt({ seen: true });
    setOpen(false);
  };

  return (
    <Modal open={open} onClose={retire} label="Join the LOOK Community newsletter" maxWidth="max-w-[520px]">
      <div className="relative overflow-hidden px-8 py-[52px] text-center text-white">
        {/* soft red glow accents, echoing the home band */}
        <span className="animate-glow pointer-events-none absolute -top-16 -left-10 size-56 rounded-full bg-accent/25 blur-3xl" />
        <span
          className="animate-glow pointer-events-none absolute -right-10 -bottom-16 size-56 rounded-full bg-accent/20 blur-3xl"
          style={{ animationDelay: "2s" }}
        />

        <button
          type="button"
          onClick={retire}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 flex size-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <div className="relative">
          <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Stay in the loop</p>
          <h2 className="mt-2 font-display text-[30px] leading-[40px] font-medium">
            Join the LOOK Community
          </h2>
          <p className="mx-auto mt-3 max-w-[400px] text-[15px] leading-[23px] text-white/75">
            Be first to know about new drops, exclusive offers, and styling edits — straight to your
            inbox.
          </p>

          <NewsletterForm autoFocus onSuccess={() => setPrompt({ seen: true })} />
        </div>
      </div>
    </Modal>
  );
}
