/**
 * Brand constants for outbound email.
 *
 * ⚠️ `site` here MIRRORS src/config/site.ts. The BFF has its own tsconfig that
 * only includes `api/`, so it cannot import from `src/` — this is a deliberate
 * duplicate, not an oversight. **Change one, change the other.**
 *
 * `palette` is the EMAIL colour scheme. It is deliberately LIGHT (ivory bg,
 * ink text) and does NOT mirror the site's dark theme in src/index.css — a
 * dark-background email gets force-inverted by Gmail's mobile dark mode, which
 * then hides the (image) logo. Emails therefore render light so they display
 * consistently and correctly on every client. Email clients strip <style> and
 * know nothing of CSS variables, so every colour is inlined at render time.
 */

export const site = {
  name: "LOOK",
  tagline: "Modern Western Essentials",
  email: "support@look.ind.in",
  instagram: "https://www.instagram.com/look_.in",
  instagramHandle: "@look_.in",
} as const;

export const palette = {
  page: "#f7f5f1", // warm ivory canvas
  surface: "#ffffff", // white callout box, a subtle lift off the ivory page
  ink: "#161616", // near-black — headings, emphasis
  accent: "#e11d2a", // brand red — button + accents (unchanged)
  body: "#3f3f3f", // dark grey — body copy, comfortable on ivory
  muted: "#6f6f6f", // muted grey — prices, footer links
  faint: "#7a7a7a", // faint grey — footer legal text
  line: "#e6e1d9", // warm hairline — dividers, dashed code box
} as const;
