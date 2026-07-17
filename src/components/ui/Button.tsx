import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "accent";

const styles: Record<Variant, string> = {
  primary: "bg-black text-white border border-black",
  outline: "border border-body text-body bg-transparent",
  accent: "bg-accent text-white border border-accent",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

/* Figma button base: px-20 py-12, r-8, shadow-xs, Poppins Medium 16/24 */
export default function Button({ variant = "primary", className = "", children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={`inline-flex cursor-pointer items-center justify-center rounded-btn px-5 py-3 text-[16px] leading-6 font-medium shadow-xs transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
