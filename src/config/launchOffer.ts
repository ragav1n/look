/** TEMPORARY — the "GO LIVE" launch promotion (August 2026).
 *
 *  Two surfaces read from here: the ticker under the home hero
 *  (`src/pages/home/LaunchTicker.tsx`) and the popup that greets a visit
 *  (`src/components/LaunchOfferPopup.tsx`). Flipping `live` to false retires
 *  both of them, and quietly hands the newsletter popup back its slot — see
 *  PageShell. Deleting the two components and this file removes the campaign
 *  for good.
 *
 *  The code is written LOOK@12 in caps everywhere, including in the ticker and
 *  the poster the client's artwork lowercased. Shopify matches discount codes
 *  case-insensitively, so both work at checkout, but a code shown in two
 *  different casings invites a shopper to wonder which one is the real one. */
export const launchOffer = {
  live: true,
  code: "LOOK@12",
  /* Poster copy, as supplied by the client. */
  headline: "Go Live",
  script: "Sale",
  lines: ["First Click, Best Deal", "Website launch offer is LIVE"],
  domain: "look.ind.in",
} as const;
