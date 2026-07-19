import { Navigate, useLocation } from "react-router-dom";

/* Shopify's hosted, passwordless flow creates the account in the same step as
   signing in, so there's no separate sign-up form. Send everyone through the one
   launcher on /login, preserving where they were headed. */
export default function Signup() {
  const location = useLocation();
  return <Navigate to="/login" replace state={location.state} />;
}
