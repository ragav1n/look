import { useState } from "react";
import { subscribeEmail } from "@/lib/newsletter";
import { useToast } from "@/context/ToastContext";

interface Props {
  /** Autofocus the input on mount — the popup wants this, the home band doesn't. */
  autoFocus?: boolean;
  /** Called after a successful subscribe (popup uses it to stop re-prompting). */
  onSuccess?: () => void;
}

/* Shared newsletter capture: email input + Subscribe button + thanks/pending
   states. Used by both the home band (SignupBanner) and the timed popup so their
   behaviour and styling stay in lockstep. Sits on a dark surface in both hosts,
   so one set of classes works everywhere. */
export default function NewsletterForm({ autoFocus, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  // Honeypot: kept empty by real users (it's off-screen and skipped by tab), so
  // a non-empty value on submit flags a bot. Sent to the BFF, which silently
  // no-ops it. See api/newsletter/subscribe.ts.
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const { push } = useToast();

  if (status === "done") {
    return (
      <p className="mt-7 text-[16px] font-medium text-white" role="status">
        Thanks &mdash; you&rsquo;re on the list &#10024;
      </p>
    );
  }

  return (
    <form
      className="mx-auto mt-7 flex max-w-[480px] flex-col gap-3 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault();
        if (status === "loading") return;
        setStatus("loading");
        const { ok } = await subscribeEmail(email, company);
        if (ok) {
          setStatus("done");
          onSuccess?.();
        } else {
          setStatus("idle");
          push("Couldn't subscribe you just now — please try again.");
        }
      }}
    >
      {/* Honeypot — visually hidden, off the tab order, not autofilled. Real
          users never touch it; bots that fill every field give themselves away. */}
      <input
        type="text"
        name="company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />
      <input
        type="email"
        required
        autoFocus={autoFocus}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        aria-label="Email address"
        className="h-[50px] flex-1 rounded-btn border border-white/15 bg-black px-5 text-[15px] text-white outline-none placeholder:text-muted focus:border-accent"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="h-[50px] shrink-0 cursor-pointer rounded-btn bg-accent px-7 text-[15px] font-medium text-white transition-all hover:scale-[1.03] hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
      >
        {status === "loading" ? "Subscribing…" : "Subscribe"}
      </button>
    </form>
  );
}
