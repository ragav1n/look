import { Link, NavLink, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import logoWhite from "@/assets/look-logo-white.png";
import logoBlack from "@/assets/look-logo-black.png";
import iconSearch from "@/assets/icon-search.svg";
import iconUser from "@/assets/icon-user.svg";
import iconWishlist from "@/assets/icon-wishlist-nav.svg";
import iconCart from "@/assets/icon-cart.svg";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/shop", label: "Shop" },
  { to: "/support", label: "Contact Us" },
];

/* Figma has two navbar variants: dark (Home, node 2007:3816) and
   light (inner pages, node 2028:1588). Both sticky, py-[22px]. */
export default function Navbar({ variant = "light" }: { variant?: "dark" | "light" }) {
  const dark = variant === "dark";
  const navigate = useNavigate();
  const { itemCount } = useCart();

  return (
    <header
      className={`sticky top-0 z-40 ${dark ? "bg-black" : "bg-white"} shadow-[0px_7px_11.2px_rgba(0,0,0,0.08)]`}
    >
      <div className="mx-auto flex h-[87px] w-full max-w-[1512px] items-center justify-between gap-6 px-6 lg:px-[85px]">
        <nav className="hidden items-center gap-[31px] lg:flex" aria-label="Primary">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `text-[16px] transition-colors ${
                  isActive
                    ? dark
                      ? "font-semibold text-surface"
                      : "font-semibold text-black"
                    : dark
                      ? "font-normal text-faint hover:text-surface"
                      : "font-normal text-muted hover:text-black"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <Link to="/" className="flex h-[43px] shrink-0 items-center" aria-label="LOOK — home">
          <img
            src={dark ? logoWhite : logoBlack}
            alt="LOOK"
            className="h-[36px] w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-6 lg:gap-[43px]">
          <button
            type="button"
            onClick={() => navigate("/shop")}
            className={`hidden h-[40px] w-[311px] items-center justify-between rounded-full border px-[22px] md:flex ${
              dark ? "border-faint" : "border-muted"
            }`}
          >
            <span className={`text-[16px] ${dark ? "text-faint" : "text-muted"}`}>
              Search for products
            </span>
            <img
              src={iconSearch}
              alt=""
              className={`h-6 w-6 ${dark ? "invert" : ""}`}
            />
          </button>
          <div className="flex items-center gap-6">
            <Link to="/account/profile" aria-label="My account">
              <img src={iconUser} alt="" className={`h-6 w-6 ${dark ? "invert" : ""}`} />
            </Link>
            <Link to="/account/wishlist" aria-label="Wishlist">
              <img src={iconWishlist} alt="" className={`h-6 w-6 ${dark ? "invert" : ""}`} />
            </Link>
            <Link to="/cart" aria-label="Cart" className="relative">
              <img src={iconCart} alt="" className={`h-6 w-6 ${dark ? "invert" : ""}`} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 font-ui text-[11px] font-medium text-white">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
