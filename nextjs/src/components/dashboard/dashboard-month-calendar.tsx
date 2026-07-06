"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type DashboardCalendarEvent = {
  id: string | number;
  label: string;
  color: string;
  title?: string;
};

type CalView = "Month" | "Week" | "Day";

export type DashboardMonthCalendarProps = {
  /**
   * Events on a single calendar day (YYYY-MM-DD).
   * Prefer this when each row in your API is one occurrence on one date.
   */
  events?: Array<DashboardCalendarEvent & { date: string }>;
  /**
   * For multi-day spans (e.g. holidays). If set, `events` is ignored.
   */
  getEventsForDate?: (isoDate: string) => DashboardCalendarEvent[];
  className?: string;
};

function buildDateMap(list: Array<DashboardCalendarEvent & { date: string }>) {
  const m = new Map<string, DashboardCalendarEvent[]>();
  for (const e of list) {
    const row: DashboardCalendarEvent = {
      id: e.id,
      label: e.label,
      color: e.color,
      title: e.title,
    };
    const arr = m.get(e.date) ?? [];
    arr.push(row);
    m.set(e.date, arr);
  }
  return m;
}

export function DashboardMonthCalendar({
  events = [],
  getEventsForDate,
  className,
}: DashboardMonthCalendarProps) {
  const now = new Date();
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth());
  const [view, setView] = React.useState<CalView>("Month");

  const byDate = React.useMemo(() => (getEventsForDate ? null : buildDateMap(events)), [events, getEventsForDate]);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

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

  const numRows = cells.length / 7;

  function dayEvents(day: number): DashboardCalendarEvent[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (getEventsForDate) return getEventsForDate(dateStr);
    return byDate?.get(dateStr) ?? [];
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-[520px] flex-col gap-4 lg:min-h-[580px]",
        className,
      )}
    >
      {/* Toolbar — shared primary / muted pattern */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button type="button" variant="default" size="icon" className="h-9 w-9 shrink-0" onClick={prev} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="default" size="icon" className="h-9 w-9 shrink-0" onClick={next} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" className="ml-1 h-9" onClick={goToday}>
            Today
          </Button>
        </div>
        <span className="text-base font-semibold tabular-nums">
          {MONTH_NAMES[month]} {year}
        </span>
        <div className="inline-flex rounded-md border border-input bg-muted/40 p-0.5">
          {(["Month", "Week", "Day"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Month grid — tall rows fill card */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid shrink-0 grid-cols-7 border-b border-border bg-muted/50">
          {DOW.map((d) => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div
          className="grid min-h-[min(52vh,520px)] flex-1 grid-cols-7 lg:min-h-[min(58vh,580px)] [&>div:nth-child(7n)]:border-r-0"
          style={{
            gridTemplateRows: `repeat(${numRows}, minmax(7rem, 1fr))`,
          }}
        >
          {cells.map((day, idx) => {
            if (!day) {
              return (
                <div
                  key={idx}
                  className="min-h-0 border-b border-r border-border bg-muted/20"
                />
              );
            }
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const evs = dayEvents(day);
            return (
              <div
                key={idx}
                className={cn(
                  "flex min-h-0 flex-col gap-0.5 border-b border-r border-border p-1.5",
                  isToday ? "bg-primary/5" : "hover:bg-muted/30",
                )}
              >
                <div className="flex justify-end">
                  <span
                    className={cn(
                      "inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                      isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                    )}
                  >
                    {day}
                  </span>
                </div>
                <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
                  {evs.slice(0, 2).map((ev) => (
                    <div
                      key={String(ev.id)}
                      className="truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight text-white"
                      style={{ backgroundColor: ev.color }}
                      title={ev.title ?? ev.label}
                    >
                      {ev.label}
                    </div>
                  ))}
                  {evs.length > 2 && (
                    <p className="pl-0.5 text-[10px] text-muted-foreground">+{evs.length - 2} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
