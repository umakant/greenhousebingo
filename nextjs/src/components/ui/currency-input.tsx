import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface CurrencyInputProps {
  label?: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  allowEmpty?: boolean;
  showSymbol?: boolean;
}

function formatCurrencyAmount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return value.toFixed(2);
}

function parseCurrencyAmount(raw: string): number | null {
  const trimmed = raw.trim().replace(/[^0-9.]/g, "");
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) / 100;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      label,
      value,
      onChange,
      error,
      required,
      disabled,
      placeholder = "0.00",
      className,
      id,
      allowEmpty = false,
      showSymbol = false,
    },
    ref,
  ) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const [focused, setFocused] = React.useState(false);
    const [draft, setDraft] = React.useState("");

    const displayValue = formatCurrencyAmount(value);

    React.useEffect(() => {
      if (!focused) setDraft(displayValue);
    }, [focused, displayValue]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/[^0-9.]/g, "");
      const parts = raw.split(".");
      const sanitized = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : raw;
      if (sanitized.includes(".")) {
        const [, decimals] = sanitized.split(".");
        if (decimals.length > 2) return;
      }
      setDraft(sanitized);

      const parsed = parseCurrencyAmount(sanitized);
      if (parsed != null) {
        onChange(parsed);
      } else if (allowEmpty && sanitized === "") {
        onChange(null);
      } else if (!allowEmpty && sanitized === "") {
        onChange(0);
      }
    }

    function handleBlur() {
      setFocused(false);
      const parsed = parseCurrencyAmount(draft);
      if (parsed == null) {
        onChange(allowEmpty ? null : 0);
        return;
      }
      onChange(parsed);
    }

    function handleFocus() {
      setFocused(true);
      setDraft(displayValue || draft);
    }

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <Label htmlFor={inputId}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <div className="relative">
          {showSymbol ? (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none pointer-events-none">
              $
            </span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            type="text"
            inputMode="decimal"
            value={focused ? draft : displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background py-2 text-sm tabular-nums ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50",
              showSymbol ? "pl-7 pr-3" : "px-3",
              error && "border-destructive",
              className,
            )}
          />
        </div>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      </div>
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput, formatCurrencyAmount, parseCurrencyAmount };
