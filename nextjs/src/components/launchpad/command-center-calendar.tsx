"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type CommandCenterCalendarEvent = {
  id: string | number;
  date: string;
  label: string;
  color: string;
  title?: string;
};

type CalView = "Month" | "Week" | "Day";

function buildDateMap(list: CommandCenterCalendarEvent[]) {
  const m = new Map<string, CommandCenterCalendarEvent[]>();
  for (const e of list) {
    const arr = m.get(e.date) ?? [];
    arr.push(e);
    m.set(e.date, arr);
  }
  return m;
}

export function CommandCenterCalendar({ events = [] }: { events?: CommandCenterCalendarEvent[] }) {
  const now = new Date();
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth());
  const [view, setView] = React.useState<CalView>("Month");

  const byDate = React.useMemo(() => buildDateMap(events), [events]);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayDow = now.getDay();

  function prev() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  }

  function next() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  }

  function goToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  const dim = new Date(year, month + 1, 0).getDate();
  const fd = new Date(year, month, 1).getDay();
  const cells: Array<number | null> = [...Array(fd).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prev}
            aria-label={t("Previous month")}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label={t("Next month")}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="ml-0.5 h-8 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted/50"
          >
            {t("Today")}
          </button>
        </div>

        <span className="ml-auto text-sm font-semibold tabular-nums text-foreground">
          {MONTH_NAMES[month]} {year}
        </span>
      </div>

      <div className="flex justify-end">
        <div className="inline-flex rounded-md border border-border bg-muted/30 p-0.5">
          {(["Month", "Week", "Day"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(v)}
            </button>
          ))}
        </div>
      </div>

      {/* Compact month grid */}
      <div className="overflow-hidden rounded-lg border border-border/80">
        <div className="grid grid-cols-7 border-b border-border/80 bg-muted/30">
          {DOW.map((d) => (
            <div
              key={d}
              className="py-1.5 text-center text-[9px] font-semibold tracking-wide text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const colDow = idx % 7;
            const isTodayColumn = colDow === todayDow && year === now.getFullYear() && month === now.getMonth();

            if (!day) {
              return (
                <div
                  key={idx}
                  className={cn(
                    "aspect-square border-b border-r border-border/60 bg-muted/10 last:border-r-0",
                    isTodayColumn && "bg-primary/10",
                  )}
                />
              );
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const evs = byDate.get(dateStr) ?? [];

            return (
              <div
                key={idx}
                className={cn(
                  "relative flex aspect-square flex-col border-b border-r border-border/60 p-0.5 last:border-r-0",
                  isTodayColumn ? "bg-primary/10" : "bg-background",
                )}
              >
                <div className="flex justify-center pt-0.5">
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                      isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                    )}
                  >
                    {day}
                  </span>
                </div>
                <div className="flex flex-1 flex-wrap content-end justify-center gap-0.5 pb-0.5">
                  {evs.slice(0, 2).map((ev) => (
                    <span
                      key={String(ev.id)}
                      className="flex h-4 w-4 items-center justify-center rounded-[3px] text-[8px] font-bold text-white"
                      style={{ backgroundColor: ev.color }}
                      title={ev.title ?? ev.label}
                    >
                      {ev.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
