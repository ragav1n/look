import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[600px] flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-script text-[64px] leading-none text-accent-bright">Oops</p>
      <h1 className="mt-4 font-display text-[32px] font-medium text-white">Page not found</h1>
      <p className="mt-2 text-[15px] leading-[24px] text-body">
        The page you’re looking for doesn’t exist or may have moved. Let’s get you back to
        something beautiful.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-btn bg-white px-6 py-3 text-[15px] font-medium text-black transition-opacity hover:opacity-85"
        >
          Back to Home
        </Link>
        <Link
          to="/shop"
          className="inline-flex items-center justify-center rounded-btn border border-line px-6 py-3 text-[15px] font-medium text-white transition-colors hover:border-accent hover:text-accent"
        >
          Browse the Shop
        </Link>
      </div>
    </div>
  );
}
