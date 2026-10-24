import type { Product } from "@/types";

/* Product search, shared by the navbar's suggestions and the Shop page.
   ────────────────────────────────────────────────────────────────────────
   The old check was one substring test of the whole query against the name and
   category, so "pink gown" found nothing (the piece is "Alba Gingham
   Gown(PINK VERSION)"), nor did "gowns", "coord" or "dress". Now:

   - Every word has to match, in any order.
   - A word matches the START of a word in the product ("gow" → Gown), so
     suggestions work while the shopper is still typing.
   - Small typos are forgiven on longer words ("gingam", "wisteira").
   - Plurals and hyphens don't matter ("gowns", "coord" → Co-ord).
   - A few shopping synonyms: a dress search shows the gowns, and so on.

   Results are ranked: a hit in the name beats a hit in the type or colour,
   which beats a hit buried in the description. */

/** Words a shopper uses for the same thing. Each word also searches its
 *  partners; the catalog's own vocabulary is "Gown", "Tops", "Coord Set". */
const SYNONYMS: Record<string, string[]> = {
  dress: ["gown"],
  gown: ["dress"],
  frock: ["dress", "gown"],
  top: ["blouse"],
  blouse: ["top"],
  coord: ["set"],
  cord: ["coord", "set"],
  set: ["coord"],
};

/** Lower-case, accents off, punctuation to spaces. Keeps hyphenated words
 *  both ways: "co-ord" yields "co", "ord" and "coord". */
function words(text: string): string[] {
  const base = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const out = base.split(/[^a-z0-9]+/).filter(Boolean);
  for (const m of base.matchAll(/[a-z0-9]+(?:-[a-z0-9]+)+/g)) out.push(m[0].replace(/-/g, ""));
  return out;
}

/** Strip a plural so "gowns", "skirts" and "dresses" meet their singulars. */
const stem = (w: string) =>
  w.length > 4 && /(?:ss|x|ch|sh)es$/.test(w)
    ? w.slice(0, -2)
    : w.length > 3 && w.endsWith("s") && !w.endsWith("ss")
      ? w.slice(0, -1)
      : w;

/** Edit distance with transpositions, giving up past `max`. */
function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return false;
  }
  return d[a.length][b.length] <= max;
}

/** How well one query word matches one product word: 3 exact, 2 prefix,
 *  1 typo, 0 no match. */
function wordScore(q: string, w: string): number {
  const qs = stem(q);
  const ws = stem(w);
  if (qs === ws) return 3;
  if (w.startsWith(q) || ws.startsWith(qs)) return 2;
  /* Typos only on words long enough to be sure of: at 4 letters one edit
     already turns "tops" into "to", "too" and "tip". Compared against the same-length
     start of the product word too, so a typo mid-typing still finds it. */
  if (q.length >= 5) {
    const max = q.length >= 8 ? 2 : 1;
    if (within(qs, ws, max) || within(q, w.slice(0, q.length), max)) return 1;
  }
  return 0;
}

/** Words that name a kind of garment. These are matched against the name and
 *  type only, never the description: a gown's description talks about its
 *  "flowing skirt", and a search for skirts shouldn't list every gown. */
const GARMENT_WORDS = new Set([
  "gown",
  "dress",
  "frock",
  "top",
  "blouse",
  "skirt",
  "set",
  "coord",
  "cord",
  "co",
  "ord",
]);

const DESCRIPTION_WEIGHT = 2;

/** Fields searched, with how much a hit in each is worth. */
function fields(p: Product): { weight: number; words: string[] }[] {
  return [
    { weight: 10, words: words(p.name) },
    {
      weight: 5,
      words: words(
        [p.category, p.group, ...(p.collectionHandles ?? []), ...p.colors.map((c) => c.name)].join(" "),
      ),
    },
    {
      weight: DESCRIPTION_WEIGHT,
      words: words(`${p.sku ?? ""} ${p.description ?? ""}`),
    },
  ];
}

const cache = new WeakMap<Product, ReturnType<typeof fields>>();
const fieldsOf = (p: Product) => {
  let f = cache.get(p);
  if (!f) cache.set(p, (f = fields(p)));
  return f;
};

/** Best score for one query word (or any of its synonyms) across a product. */
function termScore(term: string, p: Product): number {
  const alts = [term, ...(SYNONYMS[stem(term)] ?? SYNONYMS[term] ?? [])];
  let best = 0;
  const garment = GARMENT_WORDS.has(stem(term));
  for (const f of fieldsOf(p)) {
    if (garment && f.weight === DESCRIPTION_WEIGHT) continue;
    for (const w of f.words) {
      for (const [k, alt] of alts.entries()) {
        const s = wordScore(alt, w);
        /* A synonym hit counts a little less than the word itself, so a
           "dress" search still lists the Dresses first. */
        if (s) best = Math.max(best, f.weight * s * (k === 0 ? 1 : 0.8));
      }
    }
  }
  return best;
}

/** The query's words, as matched. */
export const queryTerms = (query: string): string[] => words(query);

/** Score a product against a query: 0 means it doesn't match. */
export function scoreProduct(p: Product, query: string): number {
  const terms = queryTerms(query);
  if (!terms.length) return 1;
  let total = 0;
  for (const t of terms) {
    const s = termScore(t, p);
    if (!s) return 0;
    total += s;
  }
  return total;
}

/** Products matching every word of the query, best match first. */
export function searchProducts(products: Product[], query: string): Product[] {
  if (!queryTerms(query).length) return products;
  return products
    .map((p, i) => ({ p, i, s: scoreProduct(p, query) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((r) => r.p);
}

/** Splits `text` into runs, marking the parts that matched the query, for
 *  bolding the matched letters in a suggestion. Only exact and prefix matches
 *  are marked; a typo match has no letters that honestly "match". */
export function highlight(text: string, query: string): { text: string; hit: boolean }[] {
  const terms = queryTerms(query);
  if (!terms.length) return [{ text, hit: false }];
  const out: { text: string; hit: boolean }[] = [];
  const re = /[A-Za-z0-9À-ɏ]+/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const word = m[0];
    const start = m.index ?? 0;
    const lw = word.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    let len = 0;
    for (const t of terms) {
      for (const alt of [t, ...(SYNONYMS[stem(t)] ?? [])]) {
        if (lw.startsWith(alt)) len = Math.max(len, alt.length);
        else if (stem(lw) === stem(alt)) len = Math.max(len, word.length);
      }
    }
    if (!len) continue;
    if (start > last) out.push({ text: text.slice(last, start), hit: false });
    out.push({ text: word.slice(0, len), hit: true });
    last = start + len;
  }
  if (last < text.length) out.push({ text: text.slice(last), hit: false });
  return out;
}
