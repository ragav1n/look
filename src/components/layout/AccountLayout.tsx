import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserProvider";

/* `end` only where a parent path would otherwise over-match. Orders must NOT
   use it, or viewing /account/orders/LK-24817 leaves no sidebar item active
   and the reader loses their place in the account section. */
const nav = [
  { to: "/account/profile", label: "Profile", end: true },
  { to: "/account/orders", label: "Orders", end: false },
  { to: "/account/wishlist", label: "Wishlist", end: true },
  { to: "/account/addresses", label: "Addresses", end: true },
  { to: "/account/wallet", label: "Wallet", end: true },
  { to: "/account/support", label: "Help & Support", end: true },
];

/* Account shell (Figma sidebar screens). Auth-guarded via the Customer Account
   API session — redirects to /login when signed out. Nested pages render in the
   Outlet. */
export default function AccountLayout() {
  const { user, ready, isAuthenticated, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  /* The session resolves asynchronously. Until it does, hold — redirecting on
     the initial `!isAuthenticated` would bounce every logged-in hard refresh to
     /login before the session check finishes. */
  if (!ready) {
    return (
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-center px-6 py-24">
        <p className="text-[15px] text-muted" role="status">
          Loading your account…
        </p>
      </div>
    );
  }

  /* Carry where they were headed, so signing in returns them there instead of
     dumping everyone on Profile. */
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">
        <aside className="h-fit">
          <div className="rounded-card bg-card p-5">
            <p className="text-[16px] font-medium text-white">{user?.name}</p>
            <p className="mt-0.5 truncate text-[13px] text-muted">{user?.email}</p>
          </div>
          <nav className="mt-4 flex flex-col" aria-label="Account">
            {nav.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `rounded-btn px-4 py-3 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                    isActive
                      ? "bg-accent/10 font-medium text-accent"
                      : "text-body hover:bg-surface hover:text-white"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="mt-1 rounded-btn px-4 py-3 text-left text-[15px] text-muted transition-colors hover:bg-surface hover:text-sale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Log out
            </button>
          </nav>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
