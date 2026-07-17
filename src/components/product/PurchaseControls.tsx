import iconMinus from "@/assets/pdp-icon-minus.svg";
import iconPlus from "@/assets/pdp-icon-plus.svg";

export function ColorSwatches({
  colors,
  value,
  onChange,
}: {
  colors: { name: string; hex: string }[];
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Colour" className="flex items-center gap-[14px]">
      {colors.map((c) => (
        <button
          key={c.name}
          type="button"
          role="radio"
          aria-checked={value === c.name}
          aria-label={c.name}
          onClick={() => onChange(c.name)}
          className={`size-[37px] cursor-pointer rounded-full border-2 transition-shadow ${
            value === c.name ? "border-accent ring-2 ring-accent/30" : "border-line-strong"
          }`}
          style={{ backgroundColor: c.hex }}
        />
      ))}
    </div>
  );
}

export function SizeChips({
  sizes,
  value,
  onChange,
}: {
  sizes: string[];
  value: string;
  onChange: (size: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Size" className="flex items-center gap-4">
      {sizes.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          onClick={() => onChange(s)}
          className={`flex h-[48px] min-w-[47px] cursor-pointer items-center justify-center rounded-btn border px-3 text-[16px] font-medium transition-colors ${
            value === s
              ? "border-black bg-black text-white"
              : "border-muted text-muted hover:border-black hover:text-black"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export function QuantityStepper({
  value,
  onChange,
  max = 10,
}: {
  value: number;
  onChange: (qty: number) => void;
  max?: number;
}) {
  return (
    <div className="flex h-[48px] w-[112px] items-center justify-between rounded-btn border border-muted px-3">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        className="flex size-8 cursor-pointer items-center justify-center disabled:opacity-40"
      >
        <img src={iconMinus} alt="" className="size-6" />
      </button>
      <span aria-live="polite" className="text-[16px] font-medium text-muted">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="flex size-8 cursor-pointer items-center justify-center disabled:opacity-40"
      >
        <img src={iconPlus} alt="" className="size-6" />
      </button>
    </div>
  );
}
