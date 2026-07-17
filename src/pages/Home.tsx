import { useState } from "react";
import type { Product } from "@/types";
import Hero from "./home/Hero";
import NewArrivals from "./home/NewArrivals";
import FeaturedEdit from "./home/FeaturedEdit";
import InstaReels from "./home/InstaReels";
import PriceDrop from "./home/PriceDrop";
import WhyLook from "./home/WhyLook";
import BestSellers from "./home/BestSellers";
import HomeReviews from "./home/HomeReviews";
import FaqSection from "./home/FaqSection";
import SignupBanner from "./home/SignupBanner";
import QuickViewModal from "@/components/product/QuickViewModal";

/* Home lineup per the user's brief:
   Visual movement (Hero) → New arrivals → Reels from insta → Price drop! →
   Why LOOK? → Best sellers → Reviews → FAQs → Signup → (Footer in PageShell).
   Quick-view opens from Best Sellers cards. */
export default function Home() {
  const [quickView, setQuickView] = useState<Product | null>(null);

  return (
    <>
      <Hero />
      <NewArrivals />
      <FeaturedEdit />
      <InstaReels />
      <PriceDrop />
      <WhyLook />
      <BestSellers onQuickView={setQuickView} />
      <HomeReviews />
      <FaqSection />
      <SignupBanner />
      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </>
  );
}
