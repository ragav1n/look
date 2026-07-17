/* Figma "New" badge: accent bg, r-8, Inter Medium 12, 68x18 */
export default function Badge({ children }: { children: string }) {
  return (
    <span className="inline-flex h-[18px] w-[68px] items-center justify-center rounded-btn border border-accent bg-accent font-ui text-[12px] font-medium text-white shadow-xs">
      {children}
    </span>
  );
}
