import type { Review } from "@/types";
import avPriya from "@/assets/review-priya.jpg";
import avShraddha from "@/assets/review-shraddha.jpg";
import avMeera from "@/assets/review-meera.jpg";
import avSaara from "@/assets/review-saara.jpg";
import avDivya from "@/assets/review-divya.jpg";
import avBala from "@/assets/review-bala.jpg";
import avShobhana from "@/assets/review-shobhana.jpg";
import avSwathi from "@/assets/review-swathi.jpg";
import avNandini from "@/assets/review-nandini.jpg";
import avPreethi from "@/assets/review-preethi.jpg";

/* The hand-written notes on the homepage's Customer Diaries wall — real words
   and photos customers sent in over Instagram and WhatsApp, typed up here.
   They are the wall's backfill: Sushmitha's curated picks fill positions from
   the top and these take whatever is left, so the section can never be empty.

   `productId` is deliberately EMPTY on every one of them. They were once keyed
   to invented ids ("p-ivory-knot-gown"), which matched no real product and so
   never appeared anywhere but this wall — but a fake slug-shaped id is a trap:
   the day one collides with a real product handle, fabricated reviews would
   surface on that product's page. Attributing a review to a garment it wasn't
   written about is exactly what the e-commerce rules on non-genuine reviews are
   about, so real, product-attributed reviews come from the database instead
   (see src/lib/reviews.ts). `productName` stays as the chip the wall prints. */
export const dummyReviews: Review[] = [
  {
    id: "r-1",
    productId: "",
    productName: "Ivory Knot Gown",
    author: "Priya",
    rating: 5,
    date: "2026-06-28",
    title: "Wore it to my cousin's engagement",
    body: "The fit was spot on and I didn't need any alterations. The fabric is thick enough that it doesn't cling, which I'd worried about from the photos. Three people asked me where it was from.",
    verified: true,
  },
  {
    id: "r-2",
    productId: "",
    productName: "Cherry Picnic Skirt",
    author: "Shraddha",
    rating: 4.5,
    date: "2026-06-20",
    title: "Colour is exactly like the pictures",
    body: "I've washed it twice now and the red check hasn't faded at all. It's a little long on me at 5'2, so I'm getting the hem taken up, but the fabric and stitching are worth that.",
    verified: true,
  },
  {
    id: "r-3",
    productId: "",
    productName: "Wisteria Top",
    author: "Meera",
    rating: 4,
    date: "2026-06-11",
    title: "Comfortable, but size up",
    body: "The cotton is really soft and the neckline detail looks prettier in person than online. I would size up though, the small was snug across my shoulders. Still happy I bought it.",
    verified: false,
  },
  {
    id: "r-4",
    productId: "",
    productName: "Blanc Top",
    author: "Saara",
    rating: 5,
    date: "2026-07-02",
    title: "Not see-through, which is rare",
    body: "With a white top I always worry about it being sheer, but this one is fully lined so I never had to layer under it. The modal satin feels soft and the net gives it just enough dressiness for a nicer lunch. The little bow at the neck is what sold me, and it looked just as neat after a wash.",
    verified: true,
  },
  {
    id: "r-5",
    productId: "",
    productName: "Daisy Marigold Set",
    author: "Divya",
    rating: 4.5,
    date: "2026-06-15",
    title: "Neat finishing, arrived early",
    body: "The stitching on both pieces is clean and the sizing matched the chart. I've already worn the top on its own with jeans. My only wish is that it came with a lining, but it's easy to layer under.",
    verified: true,
  },
  {
    id: "r-6",
    productId: "",
    productName: "Alba Gingham Gown",
    author: "Bala",
    rating: 5,
    date: "2026-05-30",
    title: "Ideal for a daytime function",
    body: "I wore it to an afternoon reception and it was perfect for the heat, light and airy but still dressy enough. The gingham reads almost neutral, so it worked with both my gold and silver jewellery. Fit true to size.",
    verified: true,
  },
  {
    id: "r-7",
    productId: "",
    productName: "Marigold Skirt",
    author: "Shobhana",
    rating: 5,
    date: "2026-07-08",
    title: "So much twirl in it",
    body: "I bought it for a friend's brunch and ended up wearing it twice that week. The marigold is bright without being loud, and the full skirt actually moves when you walk. It's comfortable to sit in too.",
    verified: true,
  },
  {
    id: "r-8",
    productId: "",
    productName: "Meadow Gingham Gown",
    author: "Swathi",
    rating: 5,
    date: "2026-07-12",
    title: "Held up through a garden lunch",
    body: "The pink check is softer in person than on screen, more candy than neon. I wore it to a garden lunch and the cotton stayed cool right through the afternoon. The lace edging on the neckline is neatly done, not scratchy like some I have bought before.",
    verified: true,
  },
  {
    id: "r-9",
    productId: "",
    productName: "Wisteria Mauve Set",
    author: "Nandini",
    rating: 4.5,
    date: "2026-07-19",
    title: "Just enough shine for a sangeet",
    body: "The sequin work on the skirt catches light without being over the top, so it worked for a sangeet without feeling like a costume. The top runs a little loose at the bust on me, but a quick alteration sorted that. The organza does need careful storage, I wouldn't just fold it onto a shelf.",
    verified: true,
  },
  {
    id: "r-10",
    productId: "",
    productName: "Daisy Top",
    author: "Preethi",
    rating: 5,
    date: "2026-07-25",
    title: "Works with jeans and skirts both",
    body: "I have worn this with jeans and with a long skirt and it works both ways. The ruching in front is flattering and the tie at the back lets you adjust how fitted it sits. Yellow usually washes me out but this butter shade is warm enough to work.",
    verified: true,
  },
];

/* The faces on the notes, keyed by review id rather than by name so the wall
   can be re-ordered or filtered without a note picking up a stranger's face.
   Bundled assets, because these ten are fixtures — a review from the database
   carries its own `avatar`/`photos` URL from cdn.shopify.com instead.

   The pictures are photos the customers sent in, cropped square to the face;
   Meera and Saara are still crops of the catalog's own model shots. Nandini,
   Preethi and Shobhana sent photos with the face covered (a phone, a raised
   arm), so those three are framed head-and-shoulders — there is no face in the
   source to crop to, and the client asked to run them as they are. */
export const dummyAvatars: Record<string, string> = {
  "r-1": avPriya,
  "r-2": avShraddha,
  "r-3": avMeera,
  "r-4": avSaara,
  "r-5": avDivya,
  "r-6": avBala,
  "r-7": avShobhana,
  "r-8": avSwathi,
  "r-9": avNandini,
  "r-10": avPreethi,
};

/* The nine that backfill the wall, in the order they are laid out.

   The wall is a 3-column masonry, so it only bottoms out evenly on a multiple
   of three. These nine are all verified buyers, which keeps the badge reading
   consistently on every note, and the ratings stay mixed (two 4.5s among the
   fives) so the wall doesn't look like a scrubbed all-perfect one. Meera (r-3)
   is the one unverified review and is deliberately out — she appears nowhere,
   since these fixtures no longer reach the product pages.

   Order is art-directed, and a multi-column layout fills top-to-bottom before
   it wraps, so this list reads as column one, then two, then three — NOT as
   rows. Saara (r-4) and Shobhana (r-7) sit second in their columns to put them
   in the middle and right of the second row. The tail of each column is picked
   to keep the three columns close in height. That height balance is tuned to
   these ten specific bodies and stops holding the moment real reviews take the
   front positions; it is a nice-to-have, not an invariant. */
const WALL_ORDER = [
  "r-1", "r-2", "r-9", // Priya, Shraddha, Nandini
  "r-5", "r-4", "r-6", // Divya, Saara, Bala
  "r-8", "r-7", "r-10", // Swathi, Shobhana, Preethi
];

export const DUMMY_WALL: Review[] = WALL_ORDER.flatMap(
  (id) => dummyReviews.find((r) => r.id === id) ?? [],
);
