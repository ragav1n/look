import { useRef } from "react";
import { Outlet, ScrollRestoration, useLocation, useNavigationType } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ChatWidget from "@/components/chat/ChatWidget";

/* The whole site follows the black theme, so the navbar is always dark. */
export default function PageShell() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const target = location.pathname + location.search;

  /* The enter animation replays whenever this key changes. It has to include
     the query string — the footer's Shop links only differ by `?col=`, so
     keying on pathname alone meant clicking "Dresses" then "Tops" swapped the
     grid with no transition at all.

     REPLACE navigations are excluded: Shop's own filter checkboxes rewrite the
     query with `replace: true`, and re-running a 500ms page animation (sidebar
     included) every time you tick a filter reads as a glitch, not a transition.

     Held in a ref and updated during render rather than in an effect, so the
     new key is in place on the first render of the new route — updating it
     afterwards would paint the incoming page once at full opacity and only
     then restart it from zero, which flashes. */
  const animKey = useRef(target);
  if (navigationType !== "REPLACE") animKey.current = target;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div key={animKey.current} className="animate-page-in flex-1">
        <Outlet />
      </div>
      <Footer />
      <ChatWidget />
      <ScrollRestoration />
    </div>
  );
}
