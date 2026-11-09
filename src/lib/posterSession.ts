/* The promo poster greets the first page load of a browser session, not every
   reload. Each showing costs a ~150KB download of the artwork from Vercel, and
   at launch-sale traffic that alone was ~40% of the site's bandwidth. A
   session (sessionStorage) is one tab until it closes, so a shopper who comes
   back tomorrow, or opens the site fresh, still gets greeted.

   Storage can be unavailable (private mode, blocked site data). Then the poster
   simply shows on every load, as it used to: no worse than before. */
const KEY = "look:poster-seen";

export function posterSeenThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markPosterSeen(): void {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    /* Storage blocked: it'll show again next load, which is the old behaviour. */
  }
}
