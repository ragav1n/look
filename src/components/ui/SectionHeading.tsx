interface Props {
  eyebrow?: string;
  title: string;
  sub?: string;
  align?: "left" | "center";
  className?: string;
}

/* Figma pattern: 12px uppercase accent eyebrow → 35px Playfair Medium title → 16px body sub */
export default function SectionHeading({
  eyebrow,
  title,
  sub,
  align = "left",
  className = "",
}: Props) {
  const alignCls = align === "center" ? "items-center text-center" : "items-start text-left";
  return (
    <div className={`flex flex-col gap-2 ${alignCls} ${className}`}>
      {eyebrow && (
        <p className="text-[12px] tracking-[0.08em] text-accent uppercase">{eyebrow}</p>
      )}
      <h2 className="font-display text-[35px] leading-[47px] font-medium text-white">{title}</h2>
      {sub && <p className="text-[16px] leading-[22px] text-body">{sub}</p>}
    </div>
  );
}
