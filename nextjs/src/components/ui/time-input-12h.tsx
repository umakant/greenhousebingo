"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { parseTime24, toTime24, type TimePeriod } from "@/lib/format-time-12h";

export type TimeInput12hProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  /** Tighter layout for dense forms (e.g. Gantt day rows). */
  compact?: boolean;
  /** Ultra-compact row layout with AM/PM toggle buttons. */
  dense?: boolean;
  "aria-label"?: string;
};

function PeriodToggle({
  period,
  disabled,
  dense,
  compact,
  onSelect,
}: {
  period: TimePeriod;
  disabled?: boolean;
  dense?: boolean;
  compact?: boolean;
  onSelect: (p: TimePeriod) => void;
}) {
  const btn = (label: TimePeriod) =>
    cn(
      "font-semibold transition-colors",
      dense ? "min-w-[1.35rem] px-1 text-[9px] leading-none" : compact ? "px-1.5 text-[10px]" : "px-2 text-[10px] sm:px-2.5 sm:text-xs",
      period === label ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60",
    );

  return (
    <div className="ml-auto flex h-full shrink-0 border-l border-input" role="group" aria-label="AM or PM">
      <button type="button" disabled={disabled} onClick={() => onSelect("AM")} className={btn("AM")}>
        AM
      </button>
      <button type="button" disabled={disabled} onClick={() => onSelect("PM")} className={cn(btn("PM"), "border-l border-input")}>
        PM
      </button>
    </div>
  );
}

function clampHour12(raw: number): number {
  if (Number.isNaN(raw)) return 12;
  return Math.min(12, Math.max(1, raw));
}

function clampMinute(raw: number): number {
  if (Number.isNaN(raw)) return 0;
  return Math.min(59, Math.max(0, raw));
}

export function TimeInput12h({
  value,
  onChange,
  id,
  disabled,
  className,
  compact = false,
  dense = false,
  "aria-label": ariaLabel,
}: TimeInput12hProps) {
  const parsed = parseTime24(value || "09:00");
  const [hourText, setHourText] = React.useState(String(parsed.hour12));
  const [minuteText, setMinuteText] = React.useState(String(parsed.minute).padStart(2, "0"));
  const [period, setPeriod] = React.useState<TimePeriod>(parsed.period);

  React.useEffect(() => {
    const next = parseTime24(value || "09:00");
    setHourText(String(next.hour12));
    setMinuteText(String(next.minute).padStart(2, "0"));
    setPeriod(next.period);
  }, [value]);

  const emit = (hour12: number, minute: number, nextPeriod: TimePeriod) => {
    onChange(toTime24(hour12, minute, nextPeriod));
  };

  const commitHour = (text: string) => {
    const hour12 = clampHour12(Number(text));
    setHourText(String(hour12));
    emit(hour12, clampMinute(Number(minuteText)), period);
  };

  const commitMinute = (text: string) => {
    const minute = clampMinute(Number(text));
    setMinuteText(String(minute).padStart(2, "0"));
    emit(clampHour12(Number(hourText)), minute, period);
  };

  const setNextPeriod = (nextPeriod: TimePeriod) => {
    setPeriod(nextPeriod);
    emit(clampHour12(Number(hourText)), clampMinute(Number(minuteText)), nextPeriod);
  };

  return (
    <div
      id={id}
      aria-label={ariaLabel}
      className={cn(
        "flex items-center overflow-hidden rounded-md border border-input bg-background shadow-sm ring-offset-background transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30",
        dense ? "h-7 min-w-[7.25rem] shrink-0 text-[11px]" : compact ? "h-8 min-w-[8.75rem] shrink-0 text-sm" : "h-10 w-full text-sm",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        disabled={disabled}
        aria-label={ariaLabel ? `${ariaLabel} hour` : "Hour"}
        value={hourText}
        onChange={(e) => setHourText(e.target.value.replace(/\D/g, "").slice(0, 2))}
        onBlur={() => commitHour(hourText)}
        className={cn(
          "h-full shrink-0 border-0 bg-transparent text-center outline-none",
          dense ? "w-6 px-0.5" : compact ? "w-7 px-1 text-[11px]" : "w-9 px-2",
        )}
      />
      <span className="text-muted-foreground">:</span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        disabled={disabled}
        aria-label={ariaLabel ? `${ariaLabel} minute` : "Minute"}
        value={minuteText}
        onChange={(e) => setMinuteText(e.target.value.replace(/\D/g, "").slice(0, 2))}
        onBlur={() => commitMinute(minuteText)}
        className={cn(
          "h-full shrink-0 border-0 bg-transparent text-center outline-none",
          dense ? "w-6 px-0.5" : compact ? "w-7 px-1 text-[11px]" : "w-9 px-2",
        )}
      />
      <PeriodToggle
        period={period}
        disabled={disabled}
        dense={dense}
        compact={compact}
        onSelect={setNextPeriod}
      />
    </div>
  );
}
