import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import authPhoto from "@/assets/auth-mirror-lace.jpg";
import logoWhite from "@/assets/look-logo-white.png";

/* Figma auth (Login 1:6446 / Signup 1:6486): split layout, editorial photo
   left, form right, Google auth. */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        {/* Absolutely positioned so the photo's own aspect ratio can never drive
            the row height — in flow, `h-full` doesn't resolve against an
            auto-height grid item, so a portrait crop would stretch the page
            past min-h-screen and push the caption below the fold. */}
        <img
          src={authPhoto}
          alt=""
          className="animate-auth-image absolute inset-0 h-full w-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-12 left-12 max-w-[380px] text-white">
          <p className="font-script text-[40px] leading-tight">Elevate Your Style</p>
          <p className="mt-2 text-[15px] leading-[24px] text-white/85">
            Modern western essentials, crafted to make every woman feel extraordinary.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="animate-auth-panel w-full max-w-[384px]">
          <Link to="/" aria-label="LOOK — home">
            <img src={logoWhite} alt="LOOK" className="h-8 w-auto object-contain" />
          </Link>
          <h1 className="mt-8 font-display text-[28px] leading-[36px] font-medium text-white">
            {title}
          </h1>
          <p className="mt-1 text-[15px] text-body">{subtitle}</p>
          <div className="mt-7">{children}</div>
          <p className="mt-6 text-center text-[14px] text-body">{footer}</p>
        </div>
      </div>
    </div>
  );
}

/** Primary launcher that kicks off the Shopify-hosted, passwordless sign-in. */
export function LaunchButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[50px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-btn bg-white text-[15px] font-medium text-black transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-page"
    >
      <ShoppingBag size={17} aria-hidden />
      {label}
    </button>
  );
}
