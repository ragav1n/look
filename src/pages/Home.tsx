import Hero from "./home/Hero";
import LookCollections from "./home/LookCollections";
import FeaturedEdit from "./home/FeaturedEdit";
import InstaReels from "./home/InstaReels";
import PriceDrop from "./home/PriceDrop";
import HomeReviews from "./home/HomeReviews";
import FaqSection from "./home/FaqSection";
import SignupBanner from "./home/SignupBanner";

/* Home lineup (shortened per the client's brief):
   Hero "What's New!" → What's New (product carousel) → LOOK Collections →
   Instagram Reels → Price Drop → LOOK's Customer Diaries → FAQs →
   LOOK Community → (Footer in PageShell). The old New Arrivals, Why LOOK
   benefit/feature blocks and Top Picks sections were removed to keep the page
   from getting too long. */
export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedEdit />
      <LookCollections />
      <InstaReels />
      <PriceDrop />
      <HomeReviews />
      <FaqSection />
      <SignupBanner />
    </>
  );
}
