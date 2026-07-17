import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import PageShell from "./components/layout/PageShell";
import Home from "./pages/Home";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Placeholder from "./pages/Placeholder";

const router = createBrowserRouter([
  {
    element: <PageShell />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/about", element: <About /> },
      { path: "/privacy", element: <Privacy /> },
      { path: "/shop", element: <Shop /> },
      { path: "/shop/:slug", element: <ProductDetail /> },
      { path: "/cart", element: <Cart /> },
      { path: "/support", element: <Placeholder title="Support" /> },
      { path: "/account/*", element: <Placeholder title="My Account" /> },
      { path: "*", element: <Placeholder title="Page not found" /> },
    ],
  },
  { path: "/login", element: <Placeholder title="Sign In" /> },
  { path: "/signup", element: <Placeholder title="Sign Up" /> },
]);

export default function App() {
  return (
    <CartProvider>
      <WishlistProvider>
        <RouterProvider router={router} />
      </WishlistProvider>
    </CartProvider>
  );
}
