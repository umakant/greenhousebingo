import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface CurrencyInputProps {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ label, value, onChange, error, required, disabled, placeholder = "0.00", className, id }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/[^0-9.]/g, "");
      const parts = raw.split(".");
      const sanitized = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : raw;
      onChange(sanitized);
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
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none pointer-events-none">
            $
          </span>
          <input
            ref={ref}
            id={inputId}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive",
              className,
            )}
          />
        </div>
        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
