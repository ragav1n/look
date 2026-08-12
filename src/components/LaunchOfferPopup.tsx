import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Copy } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { launchOffer } from "@/config/launchOffer";

/** Long enough for the page underneath to have painted, short enough that it
 *  still reads as the greeting it is rather than as an interruption. */
const OPEN_DELAY_MS = 800;
/** How long the code chip holds its "copied" state. */
const COPIED_MS = 2200;

/* ===== THE GRID =========================================================
   The artwork's sunset grid, drawn rather than transformed. CSS `perspective`
   on a tipped plane is the usual way to do this and it does not survive WebKit
   (see .launch-grid in index.css), so the projection is worked out here, where
   it is just arithmetic and behaves the same everywhere.

   Both bands stretch to their box (preserveAspectRatio="none"), so the viewBox
   is a grid of ratios rather than pixels; `vector-effect="non-scaling-stroke"`
   is what keeps the lines hairlines instead of stretching them with the box. */

/** Rails each side of centre. At this gap only 7 of the 25 land inside the
 *  viewBox at the near edge; the rest leave through the sides, and it's those
 *  that fill in the dense mat close to the horizon. Fewer rails than this and
 *  the ground stops reading as a floor and reads as a starburst instead. */
const RAILS = 12;
const RAIL_GAP = 90;
/** Cross lines per band. Past ~12 they land inside a pixel of each other. */
const CROSS = 12;
/* The sky gets far less of both. At ground density it stops being a horizon and
   turns into a starburst behind the headline, which is the one thing on this
   poster that has to be read first. */
const SKY_RAILS = 5;
const SKY_RAIL_GAP = 260;
const SKY_CROSS = 6;

/** Ground: seen from above, so evenly spaced cross lines land at y = H/k — a
 *  dense mat at the horizon opening out toward the viewer. */
function FloorGrid() {
  const H = 200;
  return (
    <svg className="launch-floor" viewBox={`0 0 600 ${H}`} preserveAspectRatio="none" aria-hidden focusable="false">
      <g stroke="rgba(255,255,255,0.32)" strokeWidth="1">
        {Array.from({ length: RAILS * 2 + 1 }, (_, i) => {
          const x = 300 + (i - RAILS) * RAIL_GAP;
          return <line key={x} x1="300" y1="0" x2={x} y2={H} vectorEffect="non-scaling-stroke" />;
        })}
      </g>
      <g stroke="rgba(255,255,255,0.24)" strokeWidth="1">
        {Array.from({ length: CROSS }, (_, i) => {
          const y = H / (i + 1);
          return <line key={y} x1="0" y1={y} x2="600" y2={y} vectorEffect="non-scaling-stroke" />;
        })}
      </g>
    </svg>
  );
}

/** Sky: the same grid mirrored overhead, which is where the artwork's fanned
 *  diagonals come from. Quieter than the ground — the headline sits on it. */
function SkyGrid() {
  const H = 400;
  return (
    <svg className="launch-sky" viewBox={`0 0 600 ${H}`} preserveAspectRatio="none" aria-hidden focusable="false">
      <g stroke="rgba(255,255,255,0.16)" strokeWidth="1">
        {Array.from({ length: SKY_RAILS * 2 + 1 }, (_, i) => {
          const x = 300 + (i - SKY_RAILS) * SKY_RAIL_GAP;
          return <line key={x} x1="300" y1={H} x2={x} y2="0" vectorEffect="non-scaling-stroke" />;
        })}
      </g>
      <g stroke="rgba(255,255,255,0.12)" strokeWidth="1">
        {Array.from({ length: SKY_CROSS }, (_, i) => {
          const y = H - H / (i + 1);
          return <line key={y} x1="0" y1={y} x2="600" y2={y} vectorEffect="non-scaling-stroke" />;
        })}
      </g>
    </svg>
  );
}

/* TEMPORARY — launch-offer greeting.
   ────────────────────────────────────────────────────────────────────────
   The client's "GO LIVE Sale" artwork rebuilt as a dialog: same sunset grid,
   same words, but as type and gradients (see .launch-stage in index.css) so it
   composes down to a phone instead of letterboxing. The discount code is real
   text here, which means it can be copied, read aloud by a screen reader, and
   set in caps — the artwork lowercased it.

   Shown on every visit by design (the client asked for it), which is why
   nothing is written to storage: a page load is a visit. It reappears on
   reload, not on in-app navigation, since PageShell mounts this once.

   Retire the whole promo from src/config/launchOffer.ts. */
export default function LaunchOfferPopup() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(0);

  useEffect(() => {
    if (!launchOffer.live) return;
    const t = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(launchOffer.code);
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      /* Clipboard denied or unavailable (insecure context, Safari without a
         user gesture it recognises). The code is on screen in full either way,
         so there is nothing to report and nothing to recover from. */
    }
  };

  return (
    <Modal
      open={open && launchOffer.live}
      onClose={() => setOpen(false)}
      label={`LOOK launch offer — use code ${launchOffer.code}`}
      maxWidth="max-w-[520px]"
    >
      <div className="launch-stage relative overflow-hidden text-white">
        {/* ===== THE STAGE: dusk, grid, sun, treeline (in that order — the sun
                 has to land on top of the grid, see index.css) ===== */}
        <div className="launch-grid" aria-hidden>
          <SkyGrid />
          <FloorGrid />
        </div>
        <span className="launch-sun" aria-hidden />
        <svg
          className="launch-ridge"
          viewBox="0 0 600 34"
          preserveAspectRatio="none"
          aria-hidden
          focusable="false"
        >
          {/* Ragged treeline on the horizon. Hand-plotted rather than generated:
              an even sawtooth reads as a graph, and a random one per render
              would flicker on every re-render. */}
          <path
            fill="#050506"
            d="M0 34V22l14-8 12 6 12-11 12 10 14-6 14 10 14-12 12 8 14-12 14 10 14-5 14 9 16-11 14 8 14-9 14 10 14-5 16 8 14-11 14 6 14-9 16 10 14-5 14 9 16-11 14 9 14-7 14 8 16-11 14 8 14-3 14 12 16-11 14 7 14-8 14 9 14-6 16 11 12-9 14 6 14-8 14 8 6 4v12z"
          />
        </svg>

        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        {/* ===== THE OFFER ===== */}
        <div className="relative px-6 pt-11 pb-9 text-center sm:px-10 sm:pt-12 sm:pb-10">
          {/* Headline + script, overlapping the way the artwork has them. The
              pair is one block so the script can hang off the wordmark's
              baseline without a magic offset per breakpoint. */}
          <div className="animate-fade-up" style={{ animationDelay: "0.06s" }}>
            <h2 className="font-display text-[52px] leading-[0.9] font-semibold tracking-[-0.02em] uppercase [text-shadow:0_4px_30px_rgba(0,0,0,0.55)] sm:text-[72px]">
              {launchOffer.headline}
              {/* The script line below is the second half of this heading, and a
                  screen reader should hear it as one: "Go Live Sale". */}
              <span className="sr-only"> {launchOffer.script}</span>
            </h2>
            {/* Overlapping the wordmark's baseline, but only just: Great Vibes
                has a tall S and l, and any more than this crosses the E. */}
            <p
              className="-mt-1 font-script text-[42px] leading-none [text-shadow:0_3px_22px_rgba(0,0,0,0.5)] sm:-mt-1.5 sm:text-[56px]"
              aria-hidden
            >
              {launchOffer.script}
            </p>
          </div>

          <span
            aria-hidden
            className="animate-fade-up mx-auto mt-6 block h-px w-[120px] bg-gradient-to-r from-transparent via-white/70 to-transparent"
            style={{ animationDelay: "0.16s" }}
          />

          <div className="animate-fade-up mt-6" style={{ animationDelay: "0.22s" }}>
            {launchOffer.lines.map((line) => (
              <p
                key={line}
                className="font-display text-[16px] leading-[26px] italic [text-shadow:0_2px_14px_rgba(0,0,0,0.6)] sm:text-[18px] sm:leading-[30px]"
              >
                {line}
              </p>
            ))}
          </div>

          {/* Code. A chip rather than a line of copy: it is the one thing on
              here a shopper has to carry to checkout, so it gets a target and
              copies itself. */}
          <div className="animate-fade-up mt-7" style={{ animationDelay: "0.3s" }}>
            <button
              type="button"
              onClick={copyCode}
              aria-label={`Copy discount code ${launchOffer.code}`}
              className="group inline-flex items-center gap-3 rounded-full border border-dashed border-white/55 bg-black/35 px-5 py-3 backdrop-blur-[2px] transition-colors hover:border-white hover:bg-black/50"
            >
              <span className="font-ui text-[10px] tracking-[0.22em] text-white/65 uppercase">
                Use code
              </span>
              <span className="font-ui text-[17px] font-medium tracking-[0.1em] text-white sm:text-[19px]">
                {launchOffer.code}
              </span>
              {copied ? (
                <Check className="size-[17px] text-white" strokeWidth={2} />
              ) : (
                <Copy
                  className="size-[17px] text-white/60 transition-colors group-hover:text-white"
                  strokeWidth={1.7}
                />
              )}
            </button>
            <p
              className="mt-2.5 font-display text-[13px] italic text-white/70"
              /* Live region: the copy confirmation replaces this line, so a
                 screen-reader user hears the result of their own click. */
              aria-live="polite"
            >
              {copied ? "Code copied" : "Before it’s gone"}
            </p>
          </div>

          <Link
            to="/shop"
            onClick={() => setOpen(false)}
            /* mt-10, not mt-7: this gap is where the treeline crosses, and the
               peaks need clearance from the line above them. */
            className="animate-fade-up group mt-10 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-medium text-black transition-opacity duration-300 hover:opacity-90"
            style={{ animationDelay: "0.38s" }}
          >
            Shop Now
            <ArrowRight className="size-[18px] transition-transform duration-300 group-hover:translate-x-1" />
          </Link>

          <p
            className="animate-fade-up mt-8 font-ui text-[11px] tracking-[0.3em] text-white/50"
            style={{ animationDelay: "0.46s" }}
          >
            {launchOffer.domain}
          </p>
        </div>
      </div>
    </Modal>
  );
}
