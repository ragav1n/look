import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import authPhoto from "@/assets/hero-model-1.jpg";
import logoBlack from "@/assets/look-logo-black.png";

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
      <div className="relative hidden lg:block">
        <img src={authPhoto} alt="" className="h-full w-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute bottom-12 left-12 max-w-[380px] text-white">
          <p className="font-script text-[40px] leading-tight">Elevate Your Style</p>
          <p className="mt-2 text-[15px] leading-[24px] text-white/85">
            Modern western essentials, crafted to make every woman feel extraordinary.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[384px]">
          <Link to="/" aria-label="LOOK — home">
            <img src={logoBlack} alt="LOOK" className="h-8 w-auto object-contain" />
          </Link>
          <h1 className="mt-8 font-display text-[28px] leading-[36px] font-medium text-black">
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

export const authInputClass =
  "h-[48px] w-full rounded-btn border border-line bg-white px-4 text-[15px] text-black outline-none transition-colors focus:border-accent";

export function AuthField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[14px] font-medium text-[#3d4e5c]">{label}</span>
      {children}
    </label>
  );
}

export function GoogleButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[48px] w-full cursor-pointer items-center justify-center gap-3 rounded-btn border border-line bg-white text-[15px] font-medium text-black transition-colors hover:bg-surface"
    >
      <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden>
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
      {label}
    </button>
  );
}
