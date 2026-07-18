import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ChatWidget from "@/components/chat/ChatWidget";

/* The whole site follows the black theme, so the navbar is always dark. */
export default function PageShell() {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="dark" />
      {/* Keyed by path so each navigation replays the enter animation instead of
          the new page popping in instantly. */}
      <div key={pathname} className="animate-page-in flex-1">
        <Outlet />
      </div>
      <Footer />
      <ChatWidget />
      <ScrollRestoration />
    </div>
  );
}
