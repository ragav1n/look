import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Fireworks from "@/components/Fireworks";
import Modal from "@/components/ui/Modal";
import { usePromo } from "@/hooks/usePromo";
/* The client's Diwali Sale artwork, shipped as the picture it is. It's a
   portrait poster, so unlike the old 16:9 launch artwork it fits a phone
   without letterboxing. WebP at 720 and 1080px wide (the dialog draws it at
   most ~480px, so 1080 covers a 2x screen): 91KB and 151KB, against the 3MB PNG
   it arrived as, which matters because this greets every visit. */
import poster720 from "@/assets/diwali-poster-720.webp";
import poster1080 from "@/assets/diwali-poster-1080.webp";

/** Long enough for the page underneath to have painted, short enough that it
 *  still reads as the greeting it is rather than as an interruption. */
const OPEN_DELAY_MS = 800;
/** The artwork's own proportions (1587 x 2245). */
const RATIO = 1587 / 2245;
const SRCSET = `${poster720} 720w, ${poster1080} 1080w`;
/** Matches the dialog's width cap below: 480px, or narrower when the screen is
 *  too short to fit the poster's full height. */
const SIZES = `min(480px, calc(100vw - 32px), calc(88dvh * ${RATIO.toFixed(4)}))`;
/** The words in the artwork, for anyone who can't see it. */
const POSTER_ALT =
  "Diwali Sale. Flat 25% off on festive launches. Dress up this Diwali with us and feel unstoppable, unforgettable, unapologetically you. Shop now.";

interface Props {
  /** Fired once the poster is out of the way, however it left — the newsletter
   *  invite waits on this before it starts its own clock. Never fired when the
   *  promo is retired, since there is no poster to leave: whoever is waiting
   *  has to start armed in that case (see PageShell). */
  onDismiss?: () => void;
}

/* The promo greeting.
   ────────────────────────────────────────────────────────────────────────
   Whether it runs is still Shopify's call: the poster only shows while the
   `promo` metaobject has "Show in popup poster" ticked, and unticking it
   retires the poster with no deploy. What it shows is the artwork, which lives
   here. The whole picture is the Shop Now link, since that's what the artwork
   tells the shopper to tap. A few crackers go off over it as it opens.

   Shown on every visit by design (the client asked for it), which is why
   nothing is written to storage: a page load is a visit. It reappears on
   reload, not on in-app navigation, since PageShell mounts this once. */
export default function LaunchOfferPopup({ onDismiss }: Props) {
  const promo = usePromo();
  const [open, setOpen] = useState(false);
  const [sparkling, setSparkling] = useState(false);
  const showPoster = Boolean(promo?.surfaces.poster);

  /* Opens once BOTH the delay has passed and the artwork is decoded, so the
     dialog never pops up as an empty frame that fills in afterwards. A failed
     load still opens it; the alt text carries the offer then. */
  useEffect(() => {
    if (!showPoster) return;
    let live = true;
    const img = new Image();
    img.sizes = SIZES;
    img.srcset = SRCSET;
    img.src = poster1080;
    const ready = img.decode().catch(() => {});
    const delay = new Promise((r) => window.setTimeout(r, OPEN_DELAY_MS));
    void Promise.all([ready, delay]).then(() => {
      if (!live) return;
      setOpen(true);
      setSparkling(true);
    });
    return () => {
      live = false;
    };
  }, [showPoster]);

  /* After every hook, so the order stays stable while the promo resolves from
     null to a campaign (or stays null, which is how a retired promo and a store
     that has never had one both look). */
  if (!promo) return null;

  /* One way out, used by all of them (the close button, the backdrop and
     Escape via Modal, and the poster link), so the poster cannot leave the
     screen without releasing whatever is queued behind it. */
  const dismiss = () => {
    setOpen(false);
    onDismiss?.();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={dismiss}
        label="LOOK Diwali Sale"
        maxWidth="max-w-[min(480px,calc(88dvh*0.7069))]"
      >
        <Link to={promo.ctaPath} onClick={dismiss} className="block" aria-label={`${POSTER_ALT} Opens the shop.`}>
          <img
            src={poster1080}
            srcSet={SRCSET}
            sizes={SIZES}
            alt=""
            width={1587}
            height={2245}
            className="block h-auto w-full"
          />
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-[2px] transition-colors hover:bg-black/70"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </Modal>
      {sparkling && <Fireworks onDone={() => setSparkling(false)} />}
    </>
  );
}
