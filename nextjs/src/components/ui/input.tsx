"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { DatePickerInput } from "@/components/ui/date-picker-input";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const inputClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50";

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, error, ...props }, ref) => {
  if (type === "date") {
    const { value, onChange, min, max, disabled, id, name, required, placeholder, readOnly, autoComplete, ...rest } =
      props;
    return (
      <DatePickerInput
        ref={ref}
        className={cn(inputClassName, error && "border-destructive", className)}
        value={value === undefined || value === null ? "" : String(value)}
        onChange={onChange}
        min={min as string | undefined}
        max={max as string | undefined}
        disabled={disabled}
        id={id}
        name={name}
        required={required}
        placeholder={placeholder}
        readOnly={readOnly}
        autoComplete={autoComplete}
        {...rest}
      />
    );
  }

  return (
    <input
      type={type}
      className={cn(inputClassName, error && "border-destructive", className)}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };

