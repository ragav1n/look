import { Link } from "react-router-dom";
import tulleBg from "@/assets/gray-tulle-bg.jpg";

/* Figma "Style That Speaks Before You Do" (2007:3353): 475px tulle-texture band */
export default function StyleBanner() {
  return (
    <section
      className="relative flex h-[475px] items-center justify-center overflow-hidden"
      aria-label="Style that speaks before you do"
    >
      <img
        src={tulleBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="relative flex flex-col items-center px-6 text-center">
        <p className="text-[12px] tracking-[0.08em] text-accent uppercase">
          Discover Modern Western Fashion
        </p>
        <h2 className="mt-4 max-w-[378px] font-display text-[35px] leading-[47px] font-medium text-black">
          Style That Speaks Before You Do
        </h2>
        <p className="mt-4 max-w-[695px] text-[16px] leading-[22px] text-body">
          Explore a collection designed for those who appreciate timeless Western fashion with a
          modern edge. From everyday essentials to standout pieces, our styles are crafted to keep
          you comfortable, confident, and effortlessly stylish wherever you go.
        </p>
        <Link
          to="/shop"
          className="mt-6 inline-flex w-[193px] items-center justify-center rounded-btn bg-black px-5 py-3 text-[16px] leading-6 font-medium text-white shadow-xs transition-opacity hover:opacity-85"
        >
          Explore New Arrivals
        </Link>
      </div>
    </section>
  );
}
