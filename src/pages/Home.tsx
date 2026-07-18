import Hero from "./home/Hero";
import LookCollections from "./home/LookCollections";
import FeaturedEdit from "./home/FeaturedEdit";
import InstaReels from "./home/InstaReels";
import ShopTheHits from "./home/ShopTheHits";
import PriceDrop from "./home/PriceDrop";
import WhyLook from "./home/WhyLook";
import HomeReviews from "./home/HomeReviews";
import FaqSection from "./home/FaqSection";
import SignupBanner from "./home/SignupBanner";

/* Home lineup (per the client's brief):
   Hero "What's New!" → What's New (product carousel) → LOOK Collections →
   Instagram Reels → Shop the Hits (staggered carousel) → Price Drop →
   Why LOOK? → LOOK's Customer Diaries → FAQs → LOOK Community →
   (Footer in PageShell). */
export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedEdit />
      <LookCollections />
      <InstaReels />
      <ShopTheHits />
      <PriceDrop />
      <WhyLook />
      <HomeReviews />
      <FaqSection />
      <SignupBanner />
    </>
  );
}
