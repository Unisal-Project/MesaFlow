import { classNames } from "../shared/classNames";

type QuantitySelectorProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "default" | "large";
  disabled?: boolean;
  label?: string;
};

export function QuantitySelector({ value, onChange, min = 0, max = Infinity, size = "default", disabled, label = "Quantidade" }: QuantitySelectorProps) {
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));
  return <div className={classNames("quantity", size === "large" && "large", disabled && "disabled")} aria-label={label}>
    <button type="button" onClick={decrease} disabled={disabled || value <= min} aria-label="Diminuir quantidade">−</button>
    <strong aria-live="polite">{value}</strong>
    <button type="button" onClick={increase} disabled={disabled || value >= max} aria-label="Aumentar quantidade">+</button>
  </div>;
}
