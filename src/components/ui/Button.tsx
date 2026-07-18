import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "accent";

const styles: Record<Variant, string> = {
  // On the black theme the primary action is a crisp white button; red is
  // reserved for the strongest emphasis (the `accent` variant).
  primary: "bg-white text-black border border-white hover:opacity-90",
  outline: "border border-white/40 text-white bg-transparent hover:bg-white/10",
  accent: "bg-accent text-white border border-accent hover:bg-accent-bright",
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
