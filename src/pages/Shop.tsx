import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Product, ProductSort } from "@/types";
import { getProducts } from "@/lib/catalog";
import { useAsyncData } from "@/hooks/useAsyncData";
import ProductCard, { ProductCardSkeleton } from "@/components/product/ProductCard";
import QuickViewModal from "@/components/product/QuickViewModal";

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

/* Figma Shop (1:1356). Filters + sort live in the URL (searchParams) so views
   are shareable and back/forward works. Sort is pushed to Shopify's sort key. */
export default function Shop() {
  const [params, setParams] = useSearchParams();
  const sort = (params.get("sort") as ProductSort) || "featured";
  const category = params.get("category") || "All";
  const query = (params.get("q") || "").trim();
  const [quickView, setQuickView] = useState<Product | null>(null);

  const { data, loading } = useAsyncData(() => getProducts({ sort }), [sort]);
  const products = data ?? [];

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );

  const byCategory = category === "All" ? products : products.filter((p) => p.category === category);
  const q = query.toLowerCase();
  const visible = q
    ? byCategory.filter((p) =>
        `${p.name} ${p.category} ${p.group ?? ""} ${p.sku ?? ""}`.toLowerCase().includes(q),
      )
    : byCategory;

  const clearSearch = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("q");
        return next;
      },
      { replace: true },
    );

  const setParam = (key: string, value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === "All" || (key === "sort" && value === "featured")) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1338px] px-6 py-12 min-[1400px]:px-0">
      <div className="text-center">
        <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Shop</p>
        <h1 className="mt-2 font-display text-[35px] leading-[47px] font-medium text-black">
          {query ? `Results for “${query}”` : "All Products"}
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

      <div className="mt-10 flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Filter by category"
        >
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={category === c}
              onClick={() => setParam("category", c)}
              className={`cursor-pointer rounded-full border px-4 py-2 text-[14px] transition-colors ${
                category === c
                  ? "border-accent bg-accent text-white"
                  : "border-line text-body hover:border-black hover:text-black"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="sort" className="text-[14px] text-muted">
            Sort
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setParam("sort", e.target.value)}
            className="h-[42px] cursor-pointer rounded-btn border border-line bg-white px-3 text-[14px] text-black outline-none focus:border-accent"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!loading && (
        <p className="mt-5 text-[14px] text-muted">
          {visible.length} {visible.length === 1 ? "product" : "products"}
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-[15px]">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : visible.map((p) => <ProductCard key={p.id} product={p} onQuickView={setQuickView} />)}
      </div>

      {!loading && visible.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-[18px] font-medium text-black">No products found</p>
          <p className="mt-1 text-[14px] text-body">
            {query ? "Try a different search term or category." : "Try a different category."}
          </p>
        </div>
      )}

      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </div>
  );
}
