import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* A short burst of crackers over the whole screen, then gone.
   ────────────────────────────────────────────────────────────────────────
   Hand-rolled on one canvas (no animation library, see the motion note in the
   repo): a few rockets climb from the bottom edge and break into sparks that
   fall under gravity and fade. Every rocket is launched inside the first
   ~2.4s and the last spark is out by ~4.5s, at which point the loop stops and
   the canvas is removed, so nothing keeps running behind the page.

   It sits above the dialog (Modal is z-50) and takes no pointer events, so the
   poster stays clickable straight through it. Skipped entirely for visitors
   who have asked for reduced motion. */

/** Warm festival colours: gold, marigold, ember, rose, white-hot. */
const COLOURS = ["#ffd27a", "#ffb347", "#ff7a3d", "#ff4d5e", "#fff4d6", "#ffc0cb"];
/** When each rocket leaves the ground, in ms after mount, and where it bursts
 *  as fractions of the viewport. Spread to the sides and the top so the sparks
 *  frame the poster instead of landing on its offer copy. */
const SHOTS = [
  { at: 0, x: 0.16, y: 0.24 },
  { at: 260, x: 0.84, y: 0.2 },
  { at: 620, x: 0.5, y: 0.1 },
  { at: 980, x: 0.1, y: 0.5 },
  { at: 1250, x: 0.9, y: 0.46 },
  { at: 1650, x: 0.3, y: 0.14 },
  { at: 1900, x: 0.72, y: 0.12 },
  { at: 2350, x: 0.5, y: 0.2 },
];
const SPARKS = 56;
const GRAVITY = 140; // px/s²
const DRAG = 1.6; // per second
const RISE_S = 0.7;

interface Rocket {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  colour: string;
}
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  colour: string;
  size: number;
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function Fireworks({ onDone }: { onDone?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [skip] = useState(reducedMotion);

  useEffect(() => {
    if (skip) {
      onDone?.();
      return;
    }
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    /* Capped at 2x: a 3x phone triples the fill cost for sparks that are a
       couple of pixels wide and moving. */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];
    let next = 0;
    let start = 0;
    let last = 0;
    let raf = 0;

    const burst = (x: number, y: number, colour: string) => {
      /* Big enough to read on a desktop, kept in proportion on a phone. */
      const speed = Math.min(w, h) * 0.32 + 60;
      for (let i = 0; i < SPARKS; i++) {
        const a = (i / SPARKS) * Math.PI * 2 + Math.random() * 0.2;
        const v = speed * (0.55 + Math.random() * 0.45);
        sparks.push({
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: 0,
          ttl: 1.3 + Math.random() * 0.8,
          /* Mostly the shell's colour, with a few white-gold glints. */
          colour: Math.random() < 0.2 ? "#fff4d6" : colour,
          size: 1.2 + Math.random() * 1.3,
        });
      }
    };

    const frame = (now: number) => {
      if (!start) start = last = now;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const elapsed = now - start;

      while (next < SHOTS.length && SHOTS[next].at <= elapsed) {
        const s = SHOTS[next++];
        rockets.push({
          x0: s.x * w + (Math.random() - 0.5) * 60,
          y0: h + 10,
          x1: s.x * w,
          y1: s.y * h,
          t: 0,
          colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
        });
      }

      /* Fade the last frame rather than wiping it, which is what leaves the
         short trails behind every spark. */
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.t += dt / RISE_S;
        if (r.t >= 1) {
          burst(r.x1, r.y1, r.colour);
          rockets.splice(i, 1);
          continue;
        }
        /* Eased out, so the rocket slows into its burst like a real one. */
        const e = 1 - (1 - r.t) ** 2;
        const x = r.x0 + (r.x1 - r.x0) * e;
        const y = r.y0 + (r.y1 - r.y0) * e;
        ctx.fillStyle = "#ffe2a8";
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      const drag = Math.exp(-DRAG * dt);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life += dt;
        if (p.life >= p.ttl) {
          sparks.splice(i, 1);
          continue;
        }
        p.vx *= drag;
        p.vy = p.vy * drag + GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const fade = 1 - p.life / p.ttl;
        /* A late flicker, the crackle at the end of a real shell. */
        ctx.globalAlpha = fade > 0.35 ? fade : fade * (0.4 + Math.random() * 0.6);
        ctx.fillStyle = p.colour;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (next < SHOTS.length || rockets.length || sparks.length) {
        raf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, w, h);
        onDone?.();
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
    // Runs once per mount: a new show is a new mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (skip) return null;
  return createPortal(
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] h-full w-full"
    />,
    document.body,
  );
}
