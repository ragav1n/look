/**
 * Shared look-and-feel for the owner console (/admin) — the control styles and
 * the small primitives every tab builds on. Extracted from AdminCampaigns so a
 * second tab can't quietly drift into a different shade of input or card: the
 * console is one room, and it should read as one.
 *
 * Everything here is black, grey and the one red accent (see the theme note in
 * index.css) — no second accent colour.
 */
import type { ReactNode } from "react";

export const inputCls =
  "h-[46px] w-full rounded-btn border border-line bg-surface px-4 text-[14px] text-white placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15";
export const secondaryBtn =
  "inline-flex h-[46px] cursor-pointer items-center justify-center rounded-btn border border-line px-6 text-[14px] font-medium text-body transition-colors hover:border-line-strong hover:text-white disabled:cursor-not-allowed disabled:opacity-50";
export const dangerBtn =
  "inline-flex h-[46px] cursor-pointer items-center justify-center rounded-btn bg-accent px-6 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
export const cardCls = "rounded-card border border-line bg-white/[0.02] p-6 sm:p-7";

/** Small red small-caps label used across the storefront's sections. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11px] tracking-[0.18em] text-accent uppercase">{children}</p>;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-body">{label}</span>
        {hint && <span className="text-[12px] text-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** Numbered, editorial step header — the console reads as Compose → Preview → Send. */
export function StepHeader({ n, title, desc }: { n: string; title: string; desc?: string }) {
  return (
    <div className="mb-6 flex items-start gap-3.5">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-accent/45 text-[12px] font-medium text-accent">
        {n}
      </span>
      <div>
        <h2 className="font-display text-[19px] leading-tight font-medium text-white">{title}</h2>
        {desc && <p className="mt-1 text-[13px] leading-[19px] text-muted">{desc}</p>}
      </div>
    </div>
  );
}

/** A small status pill. "auto" = LOOK/Shopify handles it with no action; "action"
 *  = a one-time thing the owner sets up. Red + grey only (no other accent). */
export function StatusBadge({ tone, children }: { tone: "auto" | "action"; children: ReactNode }) {
  const styles =
    tone === "auto"
      ? "border-line bg-white/[0.03] text-muted"
      : "border-accent/40 bg-accent-tint-soft/40 text-white";
  const dot = tone === "auto" ? "bg-muted" : "bg-accent";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] tracking-[0.16em] uppercase ${styles}`}
    >
      <span className={`inline-block size-1.5 rounded-full ${dot}`} aria-hidden />
      {children}
    </span>
  );
}
