import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import PageShell from "./components/layout/PageShell";
import Home from "./pages/Home";
import Placeholder from "./pages/Placeholder";

const router = createBrowserRouter([
  {
    element: <PageShell />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/about", element: <Placeholder title="About Us" /> },
      { path: "/shop", element: <Placeholder title="Shop" /> },
      { path: "/shop/:slug", element: <Placeholder title="Product" /> },
      { path: "/cart", element: <Placeholder title="Cart" /> },
      { path: "/checkout", element: <Placeholder title="Checkout" /> },
      {
        path: "/checkout/confirmation/:orderId",
        element: <Placeholder title="Order Confirmation" />,
      },
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
