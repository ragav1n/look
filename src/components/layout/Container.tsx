import type { ReactNode } from "react";

export default function Container({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1338px] px-6 min-[1400px]:px-0 ${className}`}>
      {children}
    </div>
  );
}
