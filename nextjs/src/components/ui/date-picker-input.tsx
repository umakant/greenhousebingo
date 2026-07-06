"use client";

import * as React from "react";
import { startOfDay } from "date-fns";
import { CalendarDays } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { useFormDisplaySettingsOptional } from "@/components/form-builder/form-display-settings-context";
import { formatDate, parseDate, toIsoDateString } from "@/lib/format-date";
import { cn } from "@/lib/utils";

function emitChange(
  el: HTMLButtonElement | null,
  value: string,
  handler: React.ChangeEventHandler<HTMLInputElement> | undefined,
) {
  if (!handler) return;
  const base = el ?? undefined;
  handler({
    target: { ...(base ?? {}), value } as EventTarget & HTMLInputElement,
    currentTarget: { ...(base ?? {}), value } as EventTarget & HTMLInputElement,
  } as React.ChangeEvent<HTMLInputElement>);
}

function setRef<T>(r: React.ForwardedRef<T>, node: T | null) {
  if (!r) return;
  if (typeof r === "function") r(node);
  else (r as React.MutableRefObject<T | null>).current = node;
}

export type DatePickerInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  value?: string | null;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  variant?: "default" | "underline";
  dateFormat?: string;
  calendarStartDay?: string;
};

export const DatePickerInput = React.forwardRef<HTMLInputElement, DatePickerInputProps>(
  function DatePickerInput(
    {
      className,
      value,
      onChange,
      disabled,
      readOnly,
      min,
      max,
      id,
      name,
      required,
      placeholder,
      variant = "default",
      dateFormat: dateFormatProp,
      calendarStartDay: calendarStartDayProp,
      onClick,
      // `Input` forwards input HTML attributes; the visible control is a `<button>`.
      ...rest
    },
    ref,
  ) {
    const [open, setOpen] = React.useState(false);

    const app = useAppSettingsOptional();
    const formDisplay = useFormDisplaySettingsOptional();
    const displayFormat =
      dateFormatProp?.trim() ||
      formDisplay?.dateFormat?.trim() ||
      app?.settings?.dateFormat?.trim() ||
      "Y-m-d";
    const firstDayRaw =
      calendarStartDayProp ?? formDisplay?.calendarStartDay ?? app?.settings?.calendarStartDay ?? "0";
    const weekStartsOn = Math.min(6, Math.max(0, Number.parseInt(String(firstDayRaw), 10) || 0)) as 0 | 1 | 2 | 3 | 4 | 5 | 6;

    const valueStr = value == null || value === "" ? "" : String(value);
    const selected = parseDate(valueStr);

    const minDate = typeof min === "string" && min.trim() ? (parseDate(min) ?? undefined) : undefined;
    const maxDate = typeof max === "string" && max.trim() ? (parseDate(max) ?? undefined) : undefined;

    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const setButtonRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        setRef(ref, node as unknown as HTMLInputElement);
      },
      [ref],
    );

    const onChangeRef = React.useRef(onChange);
    onChangeRef.current = onChange;

    const label = (() => {
      if (!valueStr) return placeholder?.trim() || "Pick a date";
      if (!selected) return valueStr;
      const formatted = formatDate(valueStr, { dateFormat: displayFormat }, "");
      return formatted || valueStr;
    })();

    const inputClassName = cn(
      variant === "underline"
        ? "flex h-10 w-full min-w-0 rounded-none border-0 border-b border-input bg-transparent px-0 py-2 text-sm shadow-none ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
        : "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50",
      className,
    );

    const disabledMatcher = React.useCallback(
      (date: Date) => {
        const t = startOfDay(date).getTime();
        if (minDate && t < startOfDay(minDate).getTime()) return true;
        if (maxDate && t > startOfDay(maxDate).getTime()) return true;
        return false;
      },
      [minDate, maxDate],
    );

    return (
      <>
        {name ? (
          <input type="hidden" name={name} value={valueStr} required={required} readOnly hidden aria-hidden />
        ) : null}
        <Popover
          open={readOnly ? false : open}
          onOpenChange={(o) => {
            if (readOnly || disabled) return;
            setOpen(o);
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              ref={setButtonRef}
              id={id}
              disabled={disabled}
              aria-required={required}
              className={cn(
                inputClassName,
                "inline-flex items-center gap-2 text-left font-normal",
                !valueStr && "text-muted-foreground",
              )}
              {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
              onClick={(e) => {
                onClick?.(e as unknown as React.MouseEvent<HTMLInputElement>);
              }}
            >
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <CalendarDays className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" sideOffset={6}>
            <Calendar
              mode="single"
              weekStartsOn={weekStartsOn}
              selected={selected ?? undefined}
              onSelect={(d) => {
                if (!d) return;
                emitChange(triggerRef.current, toIsoDateString(d), onChangeRef.current);
                setOpen(false);
              }}
              defaultMonth={selected ?? new Date()}
              disabled={disabledMatcher}
            />
          </PopoverContent>
        </Popover>
      </>
    );
  },
);

DatePickerInput.displayName = "DatePickerInput";
