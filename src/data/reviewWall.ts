import type { Review } from "@/types";
import { DUMMY_WALL } from "./reviews";

/** The homepage wall shows exactly this many notes. A 3-column masonry only
 *  bottoms out evenly on a multiple of three, and nine is what fits without the
 *  section running taller than the rest of the home page. */
export const WALL_SIZE = 9;

/**
 * Work out the nine notes the Customer Diaries wall renders.
 *
 * Sushmitha's model is "my first pick replaces the first dummy" — a dense fill
 * order, not sparse slots. Her curated reviews (already ordered by the wall
 * position she gave them) take the front, and the hand-written fixtures backfill
 * whatever is left.
 *
 * The point of routing every caller through here is that it returns a full wall
 * for EVERY input, `[]` included: an empty or failed fetch degrades to the nine
 * fixtures rather than to an empty section. That's structural, not a guard
 * someone has to remember to write.
 *
 * Worth knowing when explaining positions to her: with a CSS multi-column
 * layout, positions 1–3 are the LEFT COLUMN on desktop, 4–6 the middle and 7–9
 * the right — not the top row. On the phone rail, where most of the traffic is,
 * position 1 is simply first.
 */
export function composeWall(picks: Review[]): Review[] {
  const real = picks.slice(0, WALL_SIZE);
  return [...real, ...DUMMY_WALL.slice(real.length)].slice(0, WALL_SIZE);
}
