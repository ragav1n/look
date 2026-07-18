import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ChatWidget from "@/components/chat/ChatWidget";

/* Home uses the dark navbar variant; every other page the light one (per Figma). */
export default function PageShell() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant={isHome ? "dark" : "light"} />
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
