import { useState } from "react";
import Reveal from "@/components/ui/Reveal";

/* "LOOK Community" newsletter band — now on the black theme: a dark card with
   soft red accent glows and white text. Marketing capture only (no backend);
   wire it to your email platform (Klaviyo / Shopify customer) later. */
export default function SignupBanner() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section className="py-[80px]" aria-labelledby="signup-heading">
      <div className="mx-auto w-full max-w-[1338px] px-6 min-[1400px]:px-0">
        <Reveal
          variant="scale"
          className="relative overflow-hidden rounded-card border border-white/10 bg-surface px-8 py-[56px] text-center text-white lg:px-16"
        >
          {/* soft moving red glow accents */}
          <span className="animate-glow pointer-events-none absolute -top-16 -left-10 size-56 rounded-full bg-accent/25 blur-3xl" />
          <span
            className="animate-glow pointer-events-none absolute -right-10 -bottom-16 size-56 rounded-full bg-accent/20 blur-3xl"
            style={{ animationDelay: "2s" }}
          />
          <div className="relative">
            <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Stay in the loop</p>
            <h2 id="signup-heading" className="mt-2 font-display text-[35px] leading-[47px] font-medium">
              Join the LOOK Community
            </h2>
            <p className="mx-auto mt-3 max-w-[520px] text-[16px] leading-[24px] text-white/75">
              Be first to know about new drops, exclusive offers, and styling edits — straight to
              your inbox.
            </p>

            {done ? (
              <p className="mt-7 text-[16px] font-medium text-white" role="status">
                Thanks — you&rsquo;re on the list ✨
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
                  className="h-[50px] flex-1 rounded-btn border border-white/15 bg-black px-5 text-[15px] text-white outline-none placeholder:text-muted focus:border-accent"
                />
                <button
                  type="submit"
                  className="h-[50px] shrink-0 cursor-pointer rounded-btn bg-accent px-7 text-[15px] font-medium text-white transition-all hover:scale-[1.03] hover:bg-accent-bright"
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
