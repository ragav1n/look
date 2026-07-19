import Reveal from "@/components/ui/Reveal";
import NewsletterForm from "@/components/NewsletterForm";

/* "LOOK Community" newsletter band on the black theme: a dark card with soft red
   accent glows and white text. The capture form itself lives in NewsletterForm,
   shared with the timed popup; submitting marks the email SUBSCRIBED on Shopify
   via /api/newsletter/subscribe. */
export default function SignupBanner() {
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

            <NewsletterForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
