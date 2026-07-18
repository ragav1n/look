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

/* Sticky top nav (h-[72px]) on the black theme — the whole site is dark, so the
   navbar is always dark. A 3-column grid keeps the logo perfectly centred
   regardless of how wide the left nav / right actions get. */
export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  // close the mobile menu whenever the route changes
  useEffect(() => setMenuOpen(false), [pathname]);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
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
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex size-9 items-center justify-center lg:hidden"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
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
          className="flex h-[48px] shrink-0 items-center justify-self-center transition-transform duration-200 hover:scale-[1.03]"
          aria-label="LOOK — home"
        >
          <img src={logoWhite} alt="LOOK" className="h-[42px] w-auto object-contain" />
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
              onClick={() => navigate("/shop")}
              aria-label="Search"
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

      {/* Mobile menu panel */}
      {menuOpen && (
        <nav className="border-t border-line bg-black lg:hidden" aria-label="Mobile">
          <ul className="flex flex-col px-6 py-2">
            {links.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `block py-3 text-[16px] ${isActive ? "font-semibold text-accent" : "text-white/80"}`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
            <li>
              <Link to="/account/wishlist" className="block py-3 text-[16px] text-white/80">
                Wishlist
              </Link>
            </li>
            <li>
              <Link to="/account/profile" className="block py-3 text-[16px] text-white/80">
                My Account
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
