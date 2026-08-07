import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, ChevronUp } from "lucide-react";
import type { Product, ProductSort } from "@/types";
import { getProducts } from "@/lib/catalog";
import { canonical } from "@/lib/collections";
import { useAsyncData } from "@/hooks/useAsyncData";
import ProductCard, { ProductCardSkeleton } from "@/components/product/ProductCard";
import QuickViewModal from "@/components/product/QuickViewModal";
import LoadError from "@/components/ui/LoadError";

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

/* Sidebar category filters. LOOK's catalog uses product types (Kurta Set /
   Coord Set / Tops) + groups (Tops / Bottom) + a newArrival flag, so each
   label maps to the closest available predicate. */
const CATEGORY_FILTERS = [
  { key: "new-arrivals", label: "New Arrivals" },
  { key: "dresses", label: "Dresses" },
  { key: "tops", label: "Tops" },
  { key: "bottoms", label: "Bottoms" },
  { key: "co-ords", label: "Co-Ords" },
] as const;

/* Which Shopify product types each filter covers. Matching is case-insensitive
   and singular/plural tolerant, because these strings are typed by hand in the
   Shopify admin — a stray "bottom" for "Bottom" used to drop a product from its
   category with no visible error. */
const COL_TYPES: Record<string, string[]> = {
  dresses: ["kurta set", "gown", "dress", "dresses"],
  tops: ["tops", "top"],
  bottoms: ["bottom", "bottoms"],
  "co-ords": ["coord set", "co-ord set", "coords", "co-ords"],
};

/* A product belongs to a category if EITHER its Shopify collections say so, or
   its product type matches. Collections are the real source of truth — putting
   a "Skirt" in the Bottoms collection is enough, no code change needed — but the
   type fallback keeps products visible before their collection exists (and in
   fixture mode, which has no collections at all). */
const matchesCol = (p: Product, col: string) => {
  const key = canonical(col);
  if (key === "new-arrivals") return !!p.newArrival;

  if (p.collectionHandles?.some((h) => canonical(h) === key)) return true;

  const types = COL_TYPES[key];
  /* Unknown key (a collection created in the admin that has no type mapping).
     Falling through to `true` here matched EVERY product, so a new "Festive"
     tile showed the whole catalogue. The type fallback only makes sense for
     products carrying no collection data at all — i.e. fixture mode. */
  if (!types) return !p.collectionHandles?.length;

  // Live products carry productType in both fields; fixtures split them.
  const fields = [p.category, p.group].map((v) => v.trim().toLowerCase());
  return types.some((t) => fields.includes(t));
};

const isInStock = (p: Product) => p.variants.some((v) => v.availableForSale);

/* How long the outgoing grid fades before the new set is committed. Short on
   purpose — this sits between a filter click and its answer, so it has to read
   as a transition, not as latency. */
const GRID_FADE_MS = 170;

/* Cards enter on a stagger, capped at the first two rows of the widest grid.
   Beyond that the delay stops reading as rhythm and starts reading as lag — and
   those cards are below the fold anyway. */
const CARD_STAGGER_MS = 40;
const MAX_STAGGERED_CARDS = 6;

/* Eleven products down to three is four grid rows of height leaving at once,
   which yanks the footer up the screen. The results box eases between the two
   heights instead. Roughly the length of a card's entrance, so the layout
   settles as the last visible card lands. */
const HEIGHT_MS = 380;

/* Figma Shop (1:1356) + a left filter sidebar. Filters + sort live in the URL
   (searchParams) so views are shareable and back/forward works. */
export default function Shop() {
  const [params, setParams] = useSearchParams();
  /* Validate rather than cast: an unknown ?sort= used to reach SORT_MAP as
     undefined, throw while destructuring, and render "0 products / no products
     found" — an outage dressed up as an empty catalogue. */
  const sortParam = params.get("sort");
  const sort: ProductSort = SORTS.some((s) => s.value === sortParam)
    ? (sortParam as ProductSort)
    : "featured";
  const col = params.get("col") || "";
  const stock = (params.get("stock") || "").split(",").filter(Boolean);
  const query = (params.get("q") || "").trim();
  const [quickView, setQuickView] = useState<Product | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data, loading, error, reload } = useAsyncData(() => getProducts({ sort }), [sort]);
  const products = data ?? [];

  const setParam = (key: string, value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value || (key === "sort" && value === "featured")) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  /* Must be ONE navigation. React Router's functional updater is not queued the
     way useState's is — it hands you `new URLSearchParams(searchParams)` built
     from the CURRENT render, so two setParam calls in one handler both read the
     same pre-click snapshot and the second navigate() wins. Clearing col then
     stock used to leave the category still applied. */
  const clearFilters = () => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("col");
        next.delete("stock");
        return next;
      },
      { replace: true },
    );
  };

  // Toggle a category (clicking the active one clears it).
  const toggleCol = (key: string) => setParam("col", col === key ? "" : key);

  // Availability checkboxes — both/neither selected means "no filter".
  const toggleStock = (key: "in" | "out") => {
    const nextSet = new Set(stock);
    if (nextSet.has(key)) nextSet.delete(key);
    else nextSet.add(key);
    setParam("stock", Array.from(nextSet).join(","));
  };

  const clearSearch = () => setParam("q", "");

  const q = query.toLowerCase();
  const stockKey = [...stock].sort().join(",");
  const filterKey = `${col}|${stockKey}|${q}|${sort}`;

  /* The grid renders the APPLIED filters, which trail the URL by one short fade.
     Clicking a category used to swap every card inside a single frame — a hard
     cut. Now the current cards fade out, the new selection lands, and they
     cascade back in (`animate-card-in`, keyed on `applied.key`).

     The controls themselves stay on the live URL values, so a click still
     highlights instantly; only the imagery waits. */
  const [applied, setApplied] = useState(() => ({ key: filterKey, col, stock, q }));
  const [fading, setFading] = useState(false);

  /* The results box, and the height it was showing when the fade began. Read
     while the outgoing cards are still in the DOM — by the time the layout
     effect below runs, that height is gone. */
  const boxRef = useRef<HTMLDivElement>(null);
  const heightFrom = useRef<number | null>(null);

  useEffect(() => {
    if (filterKey === applied.key) return;

    const commit = () => {
      setApplied({ key: filterKey, col, stock: stockKey ? stockKey.split(",") : [], q });
      setFading(false);
    };

    // Nothing to ease for a shopper who asked for no motion — just swap.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const now = window.setTimeout(commit, 0);
      return () => window.clearTimeout(now);
    }

    // Next frame, so the fade starts from a painted grid rather than being
    // collapsed into the same style recalculation as the click.
    const frame = window.requestAnimationFrame(() => {
      heightFrom.current = boxRef.current?.getBoundingClientRect().height ?? null;
      setFading(true);
    });
    // A second click mid-fade cancels this one and restarts from where it is.
    const timer = window.setTimeout(commit, GRID_FADE_MS);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [filterKey, applied.key, col, stockKey, q]);

  /* Ease the box between the old and new heights so the footer slides instead of
     jumping. Layout effect, not effect: the height has to be pinned in the same
     commit that swaps the cards, before the browser paints the new one.

     Driven through the DOM rather than state — React owns no style on this node,
     so there's nothing to fight over, and it saves a render per frame. */
  useLayoutEffect(() => {
    const box = boxRef.current;
    const from = heightFrom.current;
    heightFrom.current = null;
    if (!box || from == null) return;

    /* Layout height, NOT scrollHeight. The new cards are sitting at the start of
       their entrance — translated down 14px — and that overflow counts towards
       scrollHeight, so the box would ease to 14px too tall and then snap back
       the moment the pin came off. */
    const to = box.getBoundingClientRect().height;
    if (Math.abs(to - from) < 2) return; // same number of rows — nothing to ease

    box.style.overflow = "hidden"; // rows past the current height stay clipped
    box.style.height = `${from}px`;
    void box.offsetHeight; // flush the start height, or the browser skips to `to`
    /* Eased at both ends, unlike the site's expo-out entrances. A thousand
       pixels of layout leaving at expo-out's opening speed spends a third of
       the distance in the first two frames, which is the jump this is meant to
       remove. Accelerating from rest reads as the page settling. */
    box.style.transition = `height ${HEIGHT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    box.style.height = `${to}px`;

    /* Back to auto once it lands — a pinned height would survive a viewport
       resize and crop the grid. Cleanup runs it early when a second filter
       click interrupts, so the next pass measures a real height. */
    const release = () => {
      box.style.height = "";
      box.style.transition = "";
      box.style.overflow = "";
    };
    const timer = window.setTimeout(release, HEIGHT_MS + 40);
    return () => {
      window.clearTimeout(timer);
      release();
    };
  }, [applied.key]);

  // Products after search + category, before availability (used for counts).
  const preAvailability = useMemo(
    () =>
      products.filter((p) => {
        if (applied.col && !matchesCol(p, applied.col)) return false;
        if (
          applied.q &&
          !`${p.name} ${p.category} ${p.group ?? ""} ${p.sku ?? ""}`.toLowerCase().includes(applied.q)
        )
          return false;
        return true;
      }),
    [products, applied.col, applied.q],
  );

  const inStockCount = preAvailability.filter(isInStock).length;
  const outStockCount = preAvailability.length - inStockCount;

  const visible = preAvailability.filter((p) => {
    const showIn = applied.stock.includes("in");
    const showOut = applied.stock.includes("out");
    if (showIn === showOut) return true; // both or neither → show all
    return showIn ? isInStock(p) : !isInStock(p);
  });

  const hasFilters = Boolean(col) || stock.length > 0;

  /* Arriving from a footer/home category link should announce the category —
     landing on "All Products" after clicking "Dresses" reads like the filter
     didn't take. Falls back to the raw key for a collection that has a link
     but no sidebar entry yet. */
  const colLabel = col
    ? (CATEGORY_FILTERS.find((f) => f.key === canonical(col))?.label ?? col)
    : "";

  return (
    <div className="mx-auto w-full max-w-[1338px] px-6 py-12 min-[1400px]:px-0">
      <div className="text-center">
        <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Shop</p>
        <h1 className="mt-2 font-display text-[35px] leading-[47px] font-medium text-white">
          {query ? `Results for “${query}”` : colLabel || "All Products"}
        </h1>
        {query ? (
          <button
            type="button"
            onClick={clearSearch}
            className="mt-2 text-[15px] text-accent underline-offset-4 hover:underline"
          >
            Clear search
          </button>
        ) : (
          <p className="mt-2 text-[16px] text-body">
            Explore our full collection of modern western essentials.
          </p>
        )}
      </div>

      <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:gap-10">
        {/* ===== Sidebar ===== */}
        <aside className="lg:w-[240px] lg:shrink-0">
          {/* mobile toggle */}
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            className="flex w-full items-center justify-between rounded-btn border border-line px-4 py-3 text-[15px] font-medium text-white lg:hidden"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="size-[18px]" />
              Filters{hasFilters ? " (on)" : ""}
            </span>
            <ChevronUp className={`size-[18px] transition-transform ${filtersOpen ? "" : "rotate-180"}`} />
          </button>

          <div className={`${filtersOpen ? "block" : "hidden"} mt-4 lg:mt-0 lg:block`}>
            <FilterGroup title="Categories">
              <ul className="flex flex-col">
                {CATEGORY_FILTERS.map(({ key, label }) => {
                  const active = col === key;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleCol(key)}
                        className={`w-full py-2 text-left text-[15px] transition-colors ${
                          active ? "font-medium text-accent" : "text-body hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </FilterGroup>

            <FilterGroup title="Availability">
              <div className="flex flex-col gap-3">
                <Checkbox
                  label={`In Stock (${inStockCount})`}
                  checked={stock.includes("in")}
                  onChange={() => toggleStock("in")}
                />
                <Checkbox
                  label={`Out Of Stock (${outStockCount})`}
                  checked={stock.includes("out")}
                  onChange={() => toggleStock("out")}
                />
              </div>
            </FilterGroup>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-[14px] text-accent underline-offset-4 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        </aside>

        {/* ===== Product area ===== */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
            {/* Counts the applied set, so the number changes with the cards
                rather than a beat ahead of them. */}
            <p className="text-[14px] text-muted">
              {loading
                ? "Loading…"
                : `${visible.length} ${visible.length === 1 ? "product" : "products"}`}
            </p>
            <div className="flex items-center gap-3">
              <label htmlFor="sort" className="hidden text-[14px] text-muted sm:block">
                Sort
              </label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setParam("sort", e.target.value)}
                className="h-[42px] cursor-pointer rounded-btn border border-line bg-surface px-3 text-[14px] text-white outline-none focus:border-accent"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* An outage must not read as "no results" — that blames the
              shopper's filters for the shop being unreachable. */}
          {error ? (
            <LoadError
              title="We couldn't load the collection"
              message="Something went wrong reaching the store, so we can't show products right now."
              onRetry={reload}
            />
          ) : (
            /* The measured box: everything whose height changes with the filters
               lives in here, so the grid and the empty state ease between
               heights as one block.

               The top margin belongs to the box, not to the grid inside it. As
               the grid's margin it collapses out through the box — until the
               height animation sets `overflow: hidden`, which makes the box a
               block formatting context, pulls the 24px back inside, and shunts
               the whole grid down for exactly the length of the transition. */
            <div ref={boxRef} className="mt-6">
              <div
                className={`grid grid-cols-2 gap-3 transition-opacity duration-150 ease-out sm:gap-4 lg:grid-cols-3 lg:gap-[15px] ${
                  fading ? "opacity-0" : "opacity-100"
                }`}
              >
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
                  : visible.map((p, i) => (
                      /* Keyed on the applied filters so the entrance replays even
                         for a product that survives the change. Remounting costs
                         nothing visible: the card starts transparent, so a cached
                         image is decoded long before it's on screen. */
                      <div
                        key={`${applied.key}-${p.id}`}
                        className="animate-card-in"
                        style={{
                          animationDelay: `${Math.min(i, MAX_STAGGERED_CARDS) * CARD_STAGGER_MS}ms`,
                        }}
                      >
                        <ProductCard product={p} onQuickView={setQuickView} />
                      </div>
                    ))}
              </div>

              {!loading && visible.length === 0 && (
                <div key={applied.key} className="animate-card-in py-20 text-center">
                  <p className="text-[18px] font-medium text-white">No products found</p>
                  <p className="mt-1 text-[14px] text-body">
                    {query
                      ? "Try a different search term or filter."
                      : "Try a different filter combination."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-line py-5 first:pt-0">
      <p className="mb-3 text-[13px] font-semibold tracking-[0.06em] text-white uppercase">{title}</p>
      {children}
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[15px] text-body select-none">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className="flex size-[18px] shrink-0 items-center justify-center rounded-[4px] border border-line-strong text-white transition-colors peer-checked:border-accent peer-checked:bg-accent"
        aria-hidden
      >
        {checked && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12l4 4L19 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="transition-colors peer-checked:text-white">{label}</span>
    </label>
  );
}
