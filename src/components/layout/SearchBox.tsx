import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { getAllProducts, prefetchOn } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { cdnResize } from "@/lib/image";
import { highlight, searchProducts } from "@/lib/search";
import type { Product } from "@/types";

/** Suggestions shown under the field; the rest are one tap away on /shop. */
const MAX_SUGGESTIONS = 6;

/* The catalog, fetched once on the first focus of either field and shared by
   both. Twenty-odd products is small enough to search in the browser on every
   keystroke, which is what makes the suggestions instant. */
let catalog: Promise<Product[]> | null = null;
const loadCatalog = () => {
  catalog ??= getAllProducts().catch((e) => {
    catalog = null;
    throw e;
  });
  return catalog;
};

interface Props {
  /** Desktop floats the suggestions over the page under a pill field; mobile
   *  lists them in flow, inside the search row that slides down. */
  variant: "desktop" | "mobile";
  /** Mobile: the row just opened, so take focus. */
  autoFocus?: boolean;
  /** Called after a search or a pick, so the mobile row can close. */
  onDone?: () => void;
}

/* The navbar search field, with live suggestions.
   ────────────────────────────────────────────────────────────────────────
   As the shopper types, matching pieces appear under the field with the
   matched letters picked out, using the same matcher as the Shop page (see
   lib/search.ts), so a suggestion is never something the results page then
   leaves out. Enter still runs the full search.

   An ARIA combobox: arrow keys walk the suggestions, Enter opens the one
   highlighted (or searches, if none is), Escape closes the list. */
export default function SearchBox({ variant, autoFocus, onDone }: Props) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  /* Mirror the URL into the box, so Shop's "Clear search" clears it and a
     shared /shop?q=gown link shows its term. */
  useEffect(() => {
    setQuery(new URLSearchParams(search).get("q") ?? "");
  }, [search]);

  useEffect(() => setOpen(false), [pathname, search]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const warm = () => {
    if (products) return;
    loadCatalog().then(setProducts, () => {});
  };

  const term = query.trim();
  const matches = useMemo(() => (products && term ? searchProducts(products, term) : []), [products, term]);
  const shown = matches.slice(0, MAX_SUGGESTIONS);
  const listOpen = open && term.length > 0 && products !== null;

  const finish = () => {
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    onDone?.();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (listOpen && active >= 0 && shown[active]) {
      navigate(`/shop/${shown[active].slug}`);
    } else {
      navigate(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
    }
    finish();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (listOpen) {
        e.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (!listOpen || !shown.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % shown.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? shown.length - 1 : i - 1));
    }
  };

  const desktop = variant === "desktop";
  const optionId = (i: number) => `${listId}-${i}`;

  const list = listOpen && (
    <div
      className={
        desktop
          ? "animate-fade-up absolute top-[calc(100%+10px)] right-0 z-50 w-[380px] overflow-hidden rounded-card border border-line bg-surface shadow-[0px_18px_40px_rgba(0,0,0,0.6)]"
          : "max-h-[60vh] overflow-y-auto border-t border-line bg-black"
      }
      style={desktop ? { animationDuration: "0.18s" } : undefined}
      /* Keep focus in the field while a suggestion is pressed, so the blur
         that closes the list doesn't swallow the click. */
      onMouseDown={(e) => e.preventDefault()}
    >
      {shown.length ? (
        <ul id={listId} role="listbox" aria-label="Suggested pieces" className="py-1.5">
          {shown.map((p, i) => (
            <li key={p.id} id={optionId(i)} role="option" aria-selected={i === active}>
              <Link
                to={`/shop/${p.slug}`}
                onClick={finish}
                onMouseEnter={() => setActive(i)}
                {...prefetchOn(p)}
                tabIndex={-1}
                className={`flex items-center gap-3 px-4 py-2 transition-colors ${
                  i === active ? "bg-white/[0.07]" : ""
                }`}
              >
                {p.images[0] ? (
                  <img
                    src={cdnResize(p.images[0], 120)}
                    alt=""
                    width={40}
                    height={53}
                    decoding="async"
                    className="h-[53px] w-10 shrink-0 rounded-[4px] bg-white/5 object-cover"
                  />
                ) : (
                  <span className="h-[53px] w-10 shrink-0 rounded-[4px] bg-white/5" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] text-white/65">
                    {highlight(p.name, term).map((s, k) =>
                      s.hit ? (
                        <mark key={k} className="bg-transparent font-medium text-white">
                          {s.text}
                        </mark>
                      ) : (
                        <span key={k}>{s.text}</span>
                      ),
                    )}
                  </span>
                  <span className="mt-0.5 block truncate font-ui text-[12px] text-muted">
                    {p.group || p.category} · {formatPrice(p.price, p.currencyCode)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-4 text-[14px] text-muted">
          No pieces match “{term}”. Try a colour or a style, like “pink” or “gown”.
        </p>
      )}
      {matches.length > 0 && (
        <Link
          to={`/shop?q=${encodeURIComponent(term)}`}
          onClick={finish}
          tabIndex={-1}
          className="flex items-center justify-between border-t border-line px-4 py-3 font-ui text-[13px] text-white/80 transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          <span>
            See all {matches.length} {matches.length === 1 ? "result" : "results"} for “{term}”
          </span>
          <Search className="size-4" strokeWidth={1.8} />
        </Link>
      )}
    </div>
  );

  const input = (
    <input
      ref={inputRef}
      type="search"
      value={query}
      onChange={(e) => {
        setQuery(e.target.value);
        setOpen(true);
        setActive(-1);
        warm();
      }}
      onFocus={() => {
        warm();
        setOpen(true);
      }}
      onBlur={() => setOpen(false)}
      onKeyDown={onKeyDown}
      placeholder="Search for products"
      aria-label="Search for products"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={Boolean(listOpen && shown.length)}
      aria-controls={listId}
      aria-activedescendant={listOpen && active >= 0 ? optionId(active) : undefined}
      autoComplete="off"
      className={
        desktop
          ? "min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/50"
          : "h-[42px] min-w-0 flex-1 rounded-full border border-white/25 bg-transparent px-[22px] text-[15px] text-white outline-none transition-colors placeholder:text-white/50 focus:border-white/70"
      }
    />
  );

  if (desktop) {
    return (
      <form
        onSubmit={submit}
        role="search"
        className="relative hidden h-[42px] w-[300px] items-center gap-2 rounded-full border border-white/25 pr-2 pl-[22px] transition-colors focus-within:border-white/70 lg:flex"
      >
        {input}
        <button
          type="submit"
          aria-label="Search"
          className="grid size-8 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Search className="size-5" strokeWidth={1.8} />
        </button>
        {list}
      </form>
    );
  }

  return (
    <form onSubmit={submit} role="search" className="border-t border-line bg-black">
      <div className="flex items-center gap-2 px-6 py-3">
        {input}
        <button
          type="submit"
          aria-label="Search"
          className="grid size-10 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Search className="size-5" strokeWidth={1.8} />
        </button>
      </div>
      {list}
    </form>
  );
}
