import { useState } from "react";
import Reveal from "@/components/ui/Reveal";

/* Figma newsletter band (Home 2007:3505 area): deep-violet accent card, email
   capture. Marketing capture — NOT Shopify catalog data. This is a stub with no
   backend; wire it to your email platform (Klaviyo / Shopify customer) later. */
export default function SignupBanner() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section className="py-[80px]" aria-labelledby="signup-heading">
      <div className="mx-auto w-full max-w-[1338px] px-6 min-[1400px]:px-0">
        <Reveal variant="scale" className="relative overflow-hidden rounded-card bg-accent px-8 py-[56px] text-center text-white lg:px-16">
          {/* soft moving glow accents */}
          <span className="animate-glow pointer-events-none absolute -top-16 -left-10 size-56 rounded-full bg-accent-bright/40 blur-3xl" />
          <span
            className="animate-glow pointer-events-none absolute -right-10 -bottom-16 size-56 rounded-full bg-lavender/30 blur-3xl"
            style={{ animationDelay: "2s" }}
          />
          <div className="relative">
          <p className="text-[12px] tracking-[0.08em] text-white/70 uppercase">Stay in the loop</p>
          <h2
            id="signup-heading"
            className="mt-2 font-display text-[35px] leading-[47px] font-medium"
          >
            Join the LOOK Community
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[16px] leading-[24px] text-white/85">
            Be first to know about new drops, exclusive offers, and styling edits — straight to
            your inbox.
          </p>

          {done ? (
            <p className="mt-7 text-[16px] font-medium text-white" role="status">
              Thanks — you’re on the list ✨
            </p>
          ) : (
            <form
              className="mx-auto mt-7 flex max-w-[480px] flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                setDone(true);
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                aria-label="Email address"
                className="h-[50px] flex-1 rounded-btn bg-white px-5 text-[15px] text-black outline-none placeholder:text-muted focus:ring-2 focus:ring-white/60"
              />
              <button
                type="submit"
                className="h-[50px] shrink-0 cursor-pointer rounded-btn bg-black px-7 text-[15px] font-medium text-white transition-transform hover:scale-[1.03] hover:opacity-90"
              >
                Subscribe
              </button>
            </form>
          )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
