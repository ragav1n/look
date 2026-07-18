import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserProvider";

const nav = [
  { to: "/account/profile", label: "Profile" },
  { to: "/account/orders", label: "Orders" },
  { to: "/account/wishlist", label: "Wishlist" },
  { to: "/account/addresses", label: "Addresses" },
  { to: "/account/wallet", label: "Wallet" },
  { to: "/account/support", label: "Help & Support" },
];

/* Account shell (Figma sidebar screens). Mock-auth guarded — redirects to
   /login when signed out. Nested account pages render in the Outlet. */
export default function AccountLayout() {
  const { user, isAuthenticated, logout } = useUser();
  const navigate = useNavigate();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">
        <aside className="h-fit">
          <div className="rounded-card bg-card p-5">
            <p className="text-[16px] font-medium text-white">{user?.name}</p>
            <p className="mt-0.5 truncate text-[13px] text-muted">{user?.email}</p>
          </div>
          <nav className="mt-4 flex flex-col" aria-label="Account">
            {nav.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end
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
