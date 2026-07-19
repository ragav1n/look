import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useCart } from "@/context/CartContext";
import logoWhite from "@/assets/look-logo-white.png";
import iconUser from "@/assets/icon-user.svg";
import iconWishlist from "@/assets/icon-wishlist-nav.svg";
import iconCart from "@/assets/icon-cart.svg";

const links = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/support", label: "Contact Us" },
  { to: "/about", label: "About Us" },
];

/* The mobile panel repeats the primary nav plus the account shortcuts that sit
   in the icon rail on desktop. */
const menuItems = [
  ...links.map((l) => ({ ...l, exact: l.to === "/" })),
  { to: "/account/wishlist", label: "Wishlist", exact: false },
  { to: "/account/profile", label: "My Account", exact: false },
];

/* Sticky top nav (h-[72px]) on the black theme — the whole site is dark, so the
   navbar is always dark. A 3-column grid keeps the logo perfectly centred
   regardless of how wide the left nav / right actions get. */
export default function Navbar() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  // close the mobile menu whenever the route changes
  useEffect(() => setMenuOpen(false), [pathname]);

  /* Mirror the URL into the box. It used to be write-only local state, so
     Shop's "Clear search" left the stale term sitting in the navbar, and a
     shared /shop?q=gown link showed an empty box beside filtered results. */
  useEffect(() => {
    setQuery(new URLSearchParams(search).get("q") ?? "");
  }, [search]);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
    setSearchOpen(false);
  };

  const iconClass =
    "h-6 w-6 invert transition-transform duration-200 hover:scale-110 active:scale-95";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black shadow-[0px_7px_11.2px_rgba(0,0,0,0.35)]">
      <div className="mx-auto grid h-[72px] w-full max-w-[1512px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 lg:px-[85px]">
        {/* LEFT: hamburger + primary nav */}
        <div className="flex items-center gap-4 justify-self-start">
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex size-9 items-center justify-center lg:hidden"
          >
            {/* Burger → X. Three bars on individual transform properties so the
                translate and the rotate can ease independently: closing plays in
                reverse for free. */}
            <span aria-hidden className="relative block h-4 w-[22px]">
              <span
                className={`absolute top-1/2 left-0 h-[2px] w-full rounded-full bg-white transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  menuOpen ? "translate-y-[-1px] rotate-45" : "translate-y-[-7px] rotate-0"
                }`}
              />
              <span
                className={`absolute top-1/2 left-0 h-[2px] w-full origin-center -translate-y-[1px] rounded-full bg-white transition-all duration-200 ease-out ${
                  menuOpen ? "scale-x-0 opacity-0" : "scale-x-100 opacity-100"
                }`}
              />
              <span
                className={`absolute top-1/2 left-0 h-[2px] w-full rounded-full bg-white transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  menuOpen ? "translate-y-[-1px] -rotate-45" : "translate-y-[5px] rotate-0"
                }`}
              />
            </span>
          </button>

          <nav className="hidden items-center gap-[31px] lg:flex" aria-label="Primary">
            {links.map(({ to, label }) => (
              <NavLink key={to} to={to} className="group relative py-1 text-[16px]" end={to === "/"}>
                {({ isActive }) => (
                  <>
                    <span
                      className={`transition-colors ${
                        isActive
                          ? "font-semibold text-white"
                          : "font-normal text-white/60 group-hover:text-white"
                      }`}
                    >
                      {label}
                    </span>
                    {/* animated underline: full when active, slides in on hover */}
                    <span
                      className={`absolute -bottom-0.5 left-0 h-[2px] w-full origin-left rounded-full bg-white transition-transform duration-300 ease-out ${
                        isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* CENTER: logo */}
        <Link
          to="/"
          className="flex h-[42px] shrink-0 items-center justify-self-center transition-transform duration-200 hover:scale-[1.03]"
          aria-label="LOOK — home"
        >
          <img src={logoWhite} alt="LOOK" className="h-[38px] w-auto object-contain" />
        </Link>

        {/* RIGHT: search + account actions */}
        <div className="flex items-center gap-6 justify-self-end lg:gap-[34px]">
          <form
            onSubmit={submitSearch}
            role="search"
            className="hidden h-[42px] w-[300px] items-center gap-2 rounded-full border border-white/25 pr-2 pl-[22px] transition-colors focus-within:border-white/70 md:flex"
          >
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products"
              aria-label="Search for products"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/50"
            />
            <button
              type="submit"
              aria-label="Search"
              className="grid size-8 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Search className="size-5" strokeWidth={1.8} />
            </button>
          </form>

          <div className="flex items-center gap-5 sm:gap-6">
            <button
              type="button"
              onClick={() => setSearchOpen((o) => !o)}
              aria-label="Search"
              aria-expanded={searchOpen}
              aria-controls="mobile-search"
              className="grid place-items-center text-white md:hidden"
            >
              <Search className="size-6" strokeWidth={1.8} />
            </button>
            <Link to="/account/profile" aria-label="My account">
              <img src={iconUser} alt="" className={iconClass} />
            </Link>
            <Link to="/account/wishlist" aria-label="Wishlist" className="hidden sm:block">
              <img src={iconWishlist} alt="" className={iconClass} />
            </Link>
            <Link to="/cart" aria-label="Cart" className="group relative">
              <img src={iconCart} alt="" className={iconClass} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 font-ui text-[11px] font-medium text-white transition-transform duration-200 group-hover:scale-110">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile search row. The desktop form is `hidden md:flex`, so below md the
          magnifier used to just navigate to /shop — leaving no field anywhere on
          the page and making search unreachable on a phone. Same 0fr→1fr grid
          animation as the menu panel. */}
      <div
        id="mobile-search"
        inert={!searchOpen}
        className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
          searchOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <form
            onSubmit={submitSearch}
            role="search"
            className="flex items-center gap-2 border-t border-line bg-black px-6 py-3"
          >
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products"
              aria-label="Search for products"
              autoFocus={searchOpen}
              className="h-[42px] min-w-0 flex-1 rounded-full border border-white/25 bg-transparent px-[22px] text-[15px] text-white outline-none transition-colors placeholder:text-white/50 focus:border-white/70"
            />
            <button
              type="submit"
              aria-label="Search"
              className="grid size-10 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Search className="size-5" strokeWidth={1.8} />
            </button>
          </form>
        </div>
      </div>

      {/* Mobile menu panel — stays mounted so it can animate *out* as well as in.
          The 0fr→1fr grid row animates to the panel's natural height without us
          having to measure it. `inert` keeps the collapsed panel out of the tab
          order and off screen readers. */}
      <div
        id="mobile-menu"
        inert={!menuOpen}
        className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
          menuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <nav className="min-h-0" aria-label="Mobile">
          <ul className="flex flex-col border-t border-line bg-black px-6 py-2">
            {menuItems.map(({ to, label, exact }, i) => (
              <li
                key={to}
                // Links cascade in behind the panel; on close they leave together
                // so the panel doesn't collapse around still-moving text.
                style={{ transitionDelay: menuOpen ? `${80 + i * 45}ms` : "0ms" }}
                className={`transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  menuOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
                }`}
              >
                <NavLink
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    `block py-3 text-[16px] transition-colors ${
                      isActive ? "font-semibold text-accent" : "text-white/80 hover:text-white"
                    }`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
