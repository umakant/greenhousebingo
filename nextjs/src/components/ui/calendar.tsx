"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { enUS } from "date-fns/locale";

import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/** Single-month calendar (react-day-picker v9). Global styles: `react-day-picker/style.css`. */
function Calendar({ className, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={enUS}
      className={cn(
        "p-0 font-sans text-sm leading-normal text-foreground antialiased",
        /* Match app typography: nested controls default to system UI fonts otherwise */
        "[&_button]:font-sans [&_select]:font-sans [&_option]:font-sans",
        className,
      )}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
