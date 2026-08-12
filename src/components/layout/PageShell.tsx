import { useRef, useState } from "react";
import { Outlet, ScrollRestoration, useLocation, useNavigationType } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ChatWidget from "@/components/chat/ChatWidget";
import NewsletterPopup from "@/components/NewsletterPopup";
import LaunchOfferPopup from "@/components/LaunchOfferPopup";
import { usePromo } from "@/hooks/usePromo";

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

  /* The two dialogs a visit can get, queued rather than raced. The promo poster
     greets the visit and the newsletter invite waits for it to be dismissed, so
     they're never open together — which matters more than it sounds, because
     Modal locks body scroll and traps Tab per instance: two at once would fight
     over focus, and closing either would hand scrolling back while the other was
     still up. Waiting also makes the invite's delay mean what it says, 15s of
     actual browsing rather than 15s of reading the poster.

     With no poster running there is nothing to wait for, so the invite arms
     itself. That covers the moment before the promo has loaded too: `promo` is
     null for the first ~300ms, the invite arms, and if a poster does turn up it
     disarms again long inside its own 15s clock — NewsletterPopup's timer is
     keyed on `armed` and cleans itself up, and it only marks the prompt seen
     once it has actually opened, so nothing is spent by the brief arming. */
  const promo = usePromo();
  const [posterDismissed, setPosterDismissed] = useState(false);
  const waitingOnPoster = Boolean(promo?.surfaces.poster) && !posterDismissed;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div key={animKey.current} className="animate-page-in flex-1">
        <Outlet />
      </div>
      <Footer />
      <ChatWidget />
      <NewsletterPopup armed={!waitingOnPoster} />
      <LaunchOfferPopup onDismiss={() => setPosterDismissed(true)} />
      <ScrollRestoration />
    </div>
  );
}
