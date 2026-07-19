import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, ChevronUp } from "lucide-react";
import type { Product, ProductSort } from "@/types";
import { getProducts } from "@/lib/catalog";
import { canonical } from "@/lib/collections";
import { useAsyncData } from "@/hooks/useAsyncData";
import ProductCard, { ProductCardSkeleton } from "@/components/product/ProductCard";
import QuickViewModal from "@/components/product/QuickViewModal";

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

  const { data, loading } = useAsyncData(() => getProducts({ sort }), [sort]);
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

  // Products after search + category, before availability (used for counts).
  const q = query.toLowerCase();
  const preAvailability = useMemo(
    () =>
      products.filter((p) => {
        if (col && !matchesCol(p, col)) return false;
        if (q && !`${p.name} ${p.category} ${p.group ?? ""} ${p.sku ?? ""}`.toLowerCase().includes(q))
          return false;
        return true;
      }),
    [products, col, q],
  );

  const inStockCount = preAvailability.filter(isInStock).length;
  const outStockCount = preAvailability.length - inStockCount;

  const visible = preAvailability.filter((p) => {
    const showIn = stock.includes("in");
    const showOut = stock.includes("out");
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

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-[15px]">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : visible.map((p) => (
                  <ProductCard key={p.id} product={p} onQuickView={setQuickView} />
                ))}
          </div>

          {!loading && visible.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-[18px] font-medium text-white">No products found</p>
              <p className="mt-1 text-[14px] text-body">
                {query
                  ? "Try a different search term or filter."
                  : "Try a different filter combination."}
              </p>
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
