import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { UserProvider } from "./context/UserProvider";
import { ToastProvider } from "./context/ToastContext";
import ErrorBoundary from "./components/ErrorBoundary";
import PageShell from "./components/layout/PageShell";
import AccountLayout from "./components/layout/AccountLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Returns from "./pages/Returns";
import Shipping from "./pages/Shipping";
import Terms from "./pages/Terms";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Support from "./pages/Support";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Profile from "./pages/account/Profile";
import Orders from "./pages/account/Orders";
import OrderDetail from "./pages/account/OrderDetail";
import Wishlist from "./pages/account/Wishlist";
import Addresses from "./pages/account/Addresses";
import Wallet from "./pages/account/Wallet";
import Help from "./pages/account/Help";
import NotFound from "./pages/NotFound";

const router = createBrowserRouter([
  {
    element: <PageShell />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/about", element: <About /> },
      { path: "/privacy", element: <Privacy /> },
      { path: "/returns", element: <Returns /> },
      { path: "/shipping", element: <Shipping /> },
      { path: "/terms", element: <Terms /> },
      { path: "/shop", element: <Shop /> },
      { path: "/shop/:slug", element: <ProductDetail /> },
      { path: "/cart", element: <Cart /> },
      { path: "/support", element: <Support /> },
      {
        path: "/account",
        element: <AccountLayout />,
        children: [
          { index: true, element: <Navigate to="profile" replace /> },
          { path: "profile", element: <Profile /> },
          { path: "orders", element: <Orders /> },
          { path: "orders/:orderId", element: <OrderDetail /> },
          { path: "wishlist", element: <Wishlist /> },
          { path: "addresses", element: <Addresses /> },
          { path: "wallet", element: <Wallet /> },
          { path: "support", element: <Help /> },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
]);

export default function App() {
  return (
    // Order matters: ToastProvider is outermost so UserProvider (session errors)
    // and CartProvider (mutation failures) can both report through toasts;
    // UserProvider sits above CartProvider because the cart links itself to the
    // signed-in customer for account-aware checkout.
    <ErrorBoundary>
      <ToastProvider>
        <UserProvider>
          <CartProvider>
            <WishlistProvider>
              <RouterProvider router={router} />
            </WishlistProvider>
          </CartProvider>
        </UserProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
