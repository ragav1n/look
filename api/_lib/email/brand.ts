/**
 * Brand constants for outbound email.
 *
 * ⚠️ `site` here MIRRORS src/config/site.ts. The BFF has its own tsconfig that
 * only includes `api/`, so it cannot import from `src/` — this is a deliberate
 * duplicate, not an oversight. **Change one, change the other.**
 *
 * `palette` mirrors the custom properties at the top of src/index.css. Email
 * clients strip <style> blocks and know nothing of CSS variables, so every
 * colour has to be inlined as a literal at render time.
 */

export const site = {
  name: "LOOK",
  tagline: "Modern Western Essentials",
  email: "support@look.ind.in",
  instagram: "https://www.instagram.com/look_.in",
  instagramHandle: "@look_.in",
} as const;

export const palette = {
  page: "#0a0a0a",
  surface: "#141414",
  ink: "#ffffff",
  accent: "#e11d2a",
  body: "#c9c9c9",
  muted: "#9a9a9a",
  faint: "#7f7f7f",
  line: "#272727",
} as const;
