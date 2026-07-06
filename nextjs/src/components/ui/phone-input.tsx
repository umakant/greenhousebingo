"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

type PhoneInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value?: string;
  onChange?: (value: string) => void;
};

/** US phone input with live `(000) 000-0000` formatting. */
export function PhoneInput({
  value = "",
  onChange,
  className,
  placeholder = "(000) 000-0000",
  autoComplete = "tel",
  maxLength = 14,
  ...props
}: PhoneInputProps) {
  return (
    <Input
      type="tel"
      inputMode="tel"
      autoComplete={autoComplete}
      maxLength={maxLength}
      placeholder={placeholder}
      value={formatPhone(value)}
      onChange={(e) => onChange?.(formatPhone(e.target.value))}
      className={cn(className)}
      {...props}
    />
  );
}
