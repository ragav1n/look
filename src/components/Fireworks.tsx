import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* A short Diwali show over the whole screen, then gone.
   ────────────────────────────────────────────────────────────────────────
   Hand-rolled on one canvas (no animation library, see the motion note in the
   repo). Two kinds of cracker:

   - Anaar: a flowerpot fountain at each bottom corner, spraying gold for the
     first few seconds. The one every Diwali has, and the one in the artwork.
   - Rockets: climb on a spitting ember tail and break into one of five shells
     (peony, chrysanthemum, gold willow, ring, crackle), finished with a salvo.

   Sparks are pre-rendered glow sprites (one per colour, drawn once) plus a
   short velocity streak, and the canvas fades its last frame rather than
   wiping it, which is what gives every spark its trail. The fade is worked out
   from frame time, so trails are the same length at 60 and 120Hz.

   The show is ~6s; when the last spark is out the loop stops and the canvas is
   removed, so nothing keeps running behind the page. It sits above the dialog
   (Modal is z-50) and takes no pointer events, so the poster stays clickable
   straight through it. Skipped entirely for visitors who asked for reduced
   motion. */

/** Gold, marigold, ember, rose, pink, white-hot, and one cool green for
 *  contrast in the two-colour shells. */
const GOLD = "#ffcf6b";
const PALETTE = [
  "#ffcf6b",
  "#ffa53d",
  "#ff6a3d",
  "#ff3b5c",
  "#ff8fc8",
  "#fff1d0",
  "#9dff9d",
];
const WHITE = "#fff6e0";

type Shell = "peony" | "chrysanthemum" | "willow" | "ring" | "crackle";
/** When each rocket leaves the ground (ms), and where it breaks as fractions
 *  of the viewport. Kept to the sides and the top so the shells frame the
 *  poster rather than land on its offer copy; the last three are the salvo. */
const SHOTS: { at: number; x: number; y: number; shell: Shell }[] = [
  { at: 150, x: 0.15, y: 0.22, shell: "peony" },
  { at: 500, x: 0.85, y: 0.18, shell: "chrysanthemum" },
  { at: 950, x: 0.5, y: 0.1, shell: "willow" },
  { at: 1350, x: 0.1, y: 0.45, shell: "ring" },
  { at: 1650, x: 0.9, y: 0.42, shell: "crackle" },
  { at: 2100, x: 0.28, y: 0.12, shell: "chrysanthemum" },
  { at: 2400, x: 0.73, y: 0.1, shell: "peony" },
  { at: 3000, x: 0.18, y: 0.16, shell: "willow" },
  { at: 3080, x: 0.5, y: 0.08, shell: "crackle" },
  { at: 3160, x: 0.82, y: 0.16, shell: "willow" },
];
const FOUNTAIN_S = 3.4;
const RISE_S = 0.85;
const GRAVITY = 0.33; // × the short side, per s²
/* Two budgets. A shell's own sparks are what the show is, so they get the hard
   cap and are only refused past it; everything decorative (fountain spray,
   rocket embers, gold tails, crackle pops) stops at the soft cap. With one
   shared cap the tails and the anaar filled it by ~2.4s and later shells went
   off with a handful of sparks, or none at all. */
const DECOR_CAP = 1400;
const MAX_SPARKS = 5000;
/** Tail sparks shed per second by each chrysanthemum/willow spark, and embers
 *  per second behind a climbing rocket. Per second, not per frame, so a 120Hz
 *  screen doesn't get twice the load. */
const TAIL_RATE = 14;
const EMBER_RATE = 110;
/** Shell speed, × the short side. Sets how far a burst reaches: about
 *  0.35 × the short side, which is what the break points are clamped by. */
const SHELL_SPEED = 0.5;

interface Rocket {
  x: number;
  y: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  shell: Shell;
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
  drag: number;
  /** Multiplier on gravity: willow hangs, embers drop. */
  fall: number;
  /** Sheds a fading gold tail while it flies (chrysanthemum, willow). */
  tail: boolean;
  /** Pops into white glitter near the end of its life (crackle). */
  crackle: boolean;
  /** Twinkles rather than fading smoothly. */
  flicker: boolean;
}
interface Flash {
  x: number;
  y: number;
  life: number;
  r: number;
}

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** A soft round glow with a white-hot core, drawn once per colour. */
function sprite(colour: string): HTMLCanvasElement {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.18, colour);
  grad.addColorStop(0.45, colour + "55");
  grad.addColorStop(1, colour + "00");
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  return c;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

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

    /* Capped at 2x: a 3x phone more than doubles the fill cost for sparks that
       are a few pixels wide and moving. */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    /** The short side, which every distance and speed is scaled from so a
     *  phone gets the same show as a desktop, just smaller. */
    let u = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      u = Math.min(w, h);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const sprites = new Map<string, HTMLCanvasElement>();
    for (const c of [...PALETTE, WHITE]) sprites.set(c, sprite(c));

    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];
    const flashes: Flash[] = [];
    let next = 0;
    let start = 0;
    let last = 0;
    let raf = 0;

    const spark = (
      s: Partial<Spark> &
        Pick<Spark, "x" | "y" | "vx" | "vy" | "ttl" | "colour">,
      decor = false,
    ) => {
      if (sparks.length >= (decor ? DECOR_CAP : MAX_SPARKS)) return;
      sparks.push({
        life: 0,
        size: 2,
        drag: 1.4,
        fall: 1,
        tail: false,
        crackle: false,
        flicker: false,
        ...s,
      });
    };

    const explode = (x: number, y: number, shell: Shell) => {
      const base = pick(PALETTE.slice(0, 6));
      const second = pick(PALETTE.filter((c) => c !== base));
      const v = u * SHELL_SPEED;
      flashes.push({
        x,
        y,
        life: 0,
        r: u * (shell === "willow" ? 0.16 : 0.12),
      });

      if (shell === "ring") {
        /* A tilted ring: a circle squashed on one axis, then rotated. */
        const n = 60;
        const tilt = rand(0, Math.PI);
        const squash = rand(0.35, 0.6);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const cx = Math.cos(a) * v * 0.7;
          const cy = Math.sin(a) * v * 0.7 * squash;
          spark({
            x,
            y,
            vx: cx * Math.cos(tilt) - cy * Math.sin(tilt),
            vy: cx * Math.sin(tilt) + cy * Math.cos(tilt),
            ttl: rand(1.1, 1.5),
            colour: i % 2 ? base : second,
            size: 2.2,
            drag: 1.8,
          });
        }
        for (let i = 0; i < 24; i++) {
          const a = rand(0, Math.PI * 2);
          spark({
            x,
            y,
            vx: Math.cos(a) * v * 0.18,
            vy: Math.sin(a) * v * 0.18,
            ttl: 0.9,
            colour: WHITE,
            size: 1.6,
          });
        }
        return;
      }

      const count =
        shell === "willow" ? 90 : shell === "chrysanthemum" ? 110 : 100;
      for (let i = 0; i < count; i++) {
        /* Uniform over a sphere, seen from the front: the cos-weighted speed is
           what makes it read as a ball rather than a flat disc. */
        const a = rand(0, Math.PI * 2);
        const depth = Math.sqrt(Math.random());
        const speed = v * depth * rand(0.85, 1.05);
        const vx = Math.cos(a) * speed;
        const vy = Math.sin(a) * speed;
        if (shell === "willow") {
          spark({
            x,
            y,
            vx: vx * 0.75,
            vy: vy * 0.75,
            ttl: rand(2.4, 3.1),
            colour: GOLD,
            size: 1.7,
            drag: 2.4,
            fall: 0.55,
            tail: true,
            flicker: true,
          });
        } else if (shell === "chrysanthemum") {
          spark({
            x,
            y,
            vx,
            vy,
            ttl: rand(1.4, 1.9),
            colour: i % 3 ? base : GOLD,
            size: 1.9,
            drag: 1.5,
            tail: true,
          });
        } else if (shell === "crackle") {
          spark({
            x,
            y,
            vx: vx * 0.85,
            vy: vy * 0.85,
            ttl: rand(0.9, 1.2),
            colour: base,
            size: 1.8,
            drag: 1.6,
            crackle: true,
          });
        } else {
          /* Peony: two-colour, the core in the second colour. */
          spark({
            x,
            y,
            vx,
            vy,
            ttl: rand(1.3, 1.8),
            colour: depth < 0.5 ? second : base,
            size: 2.3,
            drag: 1.5,
            flicker: Math.random() < 0.3,
          });
        }
      }
    };

    /** One frame's worth of anaar spray from a pot at (x, y). */
    const fountain = (x: number, y: number, dt: number, strength: number) => {
      const n = Math.round(220 * dt * strength);
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + rand(-0.32, 0.32);
        const speed = u * rand(0.55, 1.0) * (0.6 + 0.4 * strength);
        spark(
          {
            x: x + rand(-3, 3),
            y,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            ttl: rand(0.8, 1.3),
            colour:
              Math.random() < 0.25
                ? WHITE
                : Math.random() < 0.7
                  ? GOLD
                  : "#ffa53d",
            size: rand(1.1, 1.8),
            drag: 1.1,
            fall: 1.3,
            flicker: true,
          },
          true,
        );
      }
    };

    const frame = (now: number) => {
      if (!start) start = last = now;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const elapsed = (now - start) / 1000;
      const g = GRAVITY * u;

      /* Fade the previous frame toward transparent: frame-rate independent. */
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${1 - Math.exp(-14 * dt)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      if (elapsed < FOUNTAIN_S) {
        /* Swells in, roars, and sputters out over the last half second. */
        const s =
          Math.min(1, elapsed / 0.4) *
          Math.min(1, (FOUNTAIN_S - elapsed) / 0.6);
        fountain(w * 0.06, h, dt, s);
        fountain(w * 0.94, h, dt, s * 0.92);
      }

      while (next < SHOTS.length && SHOTS[next].at / 1000 <= elapsed) {
        const s = SHOTS[next++];
        /* Clamped so the whole burst lands on screen: on a phone the side
           shots otherwise broke 40px from the edge and lost half their ball. */
        const reach = u * SHELL_SPEED * 0.7;
        const x1 = Math.min(Math.max(s.x * w, reach), w - reach);
        const y1 = Math.max(s.y * h, reach * 0.9);
        const x0 = x1 + rand(-0.06, 0.06) * w;
        rockets.push({
          x: x0,
          y: h + 8,
          x0,
          y0: h + 8,
          x1,
          y1,
          t: 0,
          shell: s.shell,
        });
      }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.t += dt / RISE_S;
        if (r.t >= 1) {
          explode(r.x1, r.y1, r.shell);
          rockets.splice(i, 1);
          continue;
        }
        /* Eased out, so it slows into the break like a real rocket, with a
           slight wobble on the way up. */
        const e = 1 - (1 - r.t) ** 2.2;
        r.x = r.x0 + (r.x1 - r.x0) * e + Math.sin(r.t * 18) * 1.2;
        r.y = r.y0 + (r.y1 - r.y0) * e;
        /* The spitting tail: embers that drop away behind it. */
        for (let k = Math.round(EMBER_RATE * dt); k > 0; k--) {
          spark(
            {
              x: r.x,
              y: r.y,
              vx: rand(-20, 20),
              vy: rand(10, 60),
              ttl: rand(0.3, 0.6),
              colour: GOLD,
              size: 1.2,
              drag: 3,
              fall: 0.6,
              flicker: true,
            },
            true,
          );
        }
        ctx.globalAlpha = 1;
        ctx.drawImage(sprites.get(WHITE)!, r.x - 7, r.y - 7, 14, 14);
      }

      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.life += dt;
        if (f.life > 0.22) {
          flashes.splice(i, 1);
          continue;
        }
        const k = 1 - f.life / 0.22;
        const r = f.r * (0.6 + 0.4 * (1 - k));
        ctx.globalAlpha = 0.55 * k;
        ctx.drawImage(sprites.get(WHITE)!, f.x - r, f.y - r, r * 2, r * 2);
      }

      ctx.lineCap = "round";
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life += dt;
        if (p.life >= p.ttl) {
          if (p.crackle) {
            /* The pop: a few white glitter points scattered round the spot. */
            for (let k = 0; k < 4; k++) {
              spark(
                {
                  x: p.x,
                  y: p.y,
                  vx: rand(-1, 1) * u * 0.12,
                  vy: rand(-1, 1) * u * 0.12,
                  ttl: rand(0.12, 0.28),
                  colour: WHITE,
                  size: 1.5,
                  drag: 6,
                  fall: 0.2,
                },
                true,
              );
            }
          }
          sparks.splice(i, 1);
          continue;
        }
        const drag = Math.exp(-p.drag * dt);
        p.vx *= drag;
        p.vy = p.vy * drag + g * p.fall * dt;
        const px = p.x;
        const py = p.y;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.tail && Math.random() < TAIL_RATE * dt) {
          spark(
            {
              x: p.x,
              y: p.y,
              vx: p.vx * 0.05,
              vy: p.vy * 0.05,
              ttl: rand(0.25, 0.5),
              colour: GOLD,
              size: 1,
              drag: 4,
              fall: 0.8,
            },
            true,
          );
        }

        const k = 1 - p.life / p.ttl;
        let a = k < 0.3 ? k / 0.3 : 1;
        if (p.flicker) a *= 0.45 + Math.random() * 0.55;
        ctx.globalAlpha = a;

        /* A velocity streak, so a fast spark reads as moving, then the glow. */
        ctx.strokeStyle = p.colour;
        ctx.lineWidth = p.size * 0.9;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        const s = p.size * 4.5 * (0.6 + 0.4 * k);
        ctx.drawImage(
          sprites.get(p.colour) ?? sprites.get(GOLD)!,
          p.x - s / 2,
          p.y - s / 2,
          s,
          s,
        );
      }
      ctx.globalAlpha = 1;

      if (
        elapsed < FOUNTAIN_S ||
        next < SHOTS.length ||
        rockets.length ||
        sparks.length ||
        flashes.length
      ) {
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
