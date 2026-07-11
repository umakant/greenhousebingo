"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Download,
  Eye,
  Filter,
  List,
  Loader2,
  MapPin,
  Package,
  Plus,
  Search,
  Truck,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPhoneDisplay } from "@/lib/phone";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableActionButton } from "@/components/ui/table-action-button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { DASHBOARD_STAT_ICON_TINT } from "@/components/dashboard/dashboard-stat-styles";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";

const PAGE_SIZE = 10;

type EventRow = {
  id: string;
  vendorId: string;
  vendorName: string | null;
  city: string;
  state: string;
  deliveryDate: string | null;
  startTime: string | null;
  endTime: string | null;
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  driverName: string | null;
  driverPhone: string | null;
  status: string;
  orderCount: number;
  totalRevenue: number;
  currency: string;
  createdAt: string;
};

type Summary = {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
};

type StatusKey = "scheduled" | "completed" | "cancelled" | "pending" | "rescheduled" | "delivered";

const STATUS_STYLES: Record<
  string,
  { badge: string; calendarEvent: string; dot: string; label: string }
> = {
  scheduled: {
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    calendarEvent:
      "border-l-blue-500 bg-blue-50 text-blue-950 hover:bg-blue-100/80 dark:border-l-blue-400 dark:bg-blue-950/50 dark:text-blue-100",
    dot: "bg-blue-500",
    label: "Scheduled",
  },
  completed: {
    badge: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
    calendarEvent:
      "border-l-green-500 bg-green-50 text-green-950 hover:bg-green-100/80 dark:border-l-green-400 dark:bg-green-950/50 dark:text-green-100",
    dot: "bg-green-500",
    label: "Completed",
  },
  delivered: {
    badge: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
    calendarEvent:
      "border-l-green-500 bg-green-50 text-green-950 hover:bg-green-100/80 dark:border-l-green-400 dark:bg-green-950/50 dark:text-green-100",
    dot: "bg-green-500",
    label: "Completed",
  },
  cancelled: {
    badge: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
    calendarEvent:
      "border-l-red-500 bg-red-50 text-red-950 hover:bg-red-100/80 dark:border-l-red-400 dark:bg-red-950/50 dark:text-red-100",
    dot: "bg-red-500",
    label: "Cancelled",
  },
  pending: {
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
    calendarEvent:
      "border-l-orange-500 bg-orange-50 text-orange-950 hover:bg-orange-100/80 dark:border-l-orange-400 dark:bg-orange-950/50 dark:text-orange-100",
    dot: "bg-orange-500",
    label: "Pending",
  },
  rescheduled: {
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
    calendarEvent:
      "border-l-purple-500 bg-purple-50 text-purple-950 hover:bg-purple-100/80 dark:border-l-purple-400 dark:bg-purple-950/50 dark:text-purple-100",
    dot: "bg-purple-500",
    label: "Rescheduled",
  },
};

function statusStyle(status: string) {
  return (
    STATUS_STYLES[status] ?? {
      badge: "bg-muted text-muted-foreground",
      calendarEvent: "border-l-muted-foreground bg-muted text-foreground",
      dot: "bg-muted-foreground",
      label: status.replace(/_/g, " "),
    }
  );
}

function formatTime12h(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const [hRaw, mRaw] = value.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw ?? 0);
  if (Number.isNaN(h)) return value;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatWindow(start: string | null, end: string | null): string {
  const s = formatTime12h(start);
  const e = formatTime12h(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return s;
  return "—";
}

function formatDateLong(iso: string | null): { date: string; day: string } {
  if (!iso) return { date: "—", day: "" };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    day: d.toLocaleDateString(undefined, { weekday: "short" }),
  };
}

function initials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function eventDateOnly(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
}

function matchesDateFilter(iso: string | null, filter: string): boolean {
  if (filter === "all" || !iso) return filter === "all" || !iso;
  const d = eventDateOnly(iso);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (filter === "today") return d.getTime() === today.getTime();
  if (filter === "upcoming") return d >= today;
  if (filter === "past") return d < today;

  if (filter === "this_week") {
    const weekStart = startOfWeek(today);
    const weekEnd = addDays(weekStart, 6);
    weekEnd.setHours(23, 59, 59, 999);
    return d >= weekStart && d <= weekEnd;
  }

  if (filter === "this_month") {
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }

  return true;
}

function InitialsAvatar({
  name,
  tint = DASHBOARD_STAT_ICON_TINT,
}: {
  name: string;
  tint?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        tint,
      )}
    >
      {initials(name)}
    </span>
  );
}

function parseTimeMinutes(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function addMonths(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + n);
  return copy;
}

function startOfMonth(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), 1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayIndexInWeek(dateIso: string | null, weekStart: Date): number {
  const d = eventDateOnly(dateIso);
  if (!d) return -1;
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return diff >= 0 && diff < 7 ? diff : -1;
}

function eventsOnDay(rows: EventRow[], day: Date): EventRow[] {
  return rows.filter((r) => {
    const d = eventDateOnly(r.deliveryDate);
    return d ? sameDay(d, day) : false;
  });
}

type CalendarViewMode = "week" | "month" | "day";

const CALENDAR_START_HOUR = 8;
const CALENDAR_END_HOUR = 18;
const CALENDAR_HOUR_HEIGHT = 56;

function StatCard({
  icon,
  label,
  value,
  sub,
  tint = DASHBOARD_STAT_ICON_TINT,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tint)}>{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          {sub ? <p className="truncate text-xs text-muted-foreground">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style = statusStyle(status);
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", style.badge)}>
      {style.label}
    </span>
  );
}

function EventDetailSheet({
  row,
  open,
  onOpenChange,
  money,
}: {
  row: EventRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  money: (n: number) => string;
}) {
  if (!row) return null;
  const { date, day } = formatDateLong(row.deliveryDate);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {row.city}, {row.state}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("Status")}</span>
            <StatusBadge status={row.status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("Date")}</span>
            <span className="font-medium">
              {date}
              {day ? ` (${day})` : ""}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("Window")}</span>
            <span>{formatWindow(row.startTime, row.endTime)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("Vendor")}</span>
            <span>{row.vendorName ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("Driver")}</span>
            <span>
              {row.driverName ?? "—"}
              {row.driverPhone ? (
                <span className="block text-right text-xs text-muted-foreground">{formatPhoneDisplay(row.driverPhone)}</span>
              ) : null}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("Orders")}</span>
            <span className="tabular-nums">{row.orderCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("Revenue")}</span>
            <span className="font-semibold">{money(row.totalRevenue)}</span>
          </div>
          {row.deliveryAddress ? (
            <div>
              <p className="text-muted-foreground">{t("Address")}</p>
              <p className="mt-1">{row.deliveryAddress}</p>
            </div>
          ) : null}
          {row.deliveryNotes ? (
            <div>
              <p className="text-muted-foreground">{t("Notes")}</p>
              <p className="mt-1">{row.deliveryNotes}</p>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CalendarEventBlock({
  evt,
  onEventClick,
  style,
  top,
  height,
}: {
  evt: EventRow;
  onEventClick?: (row: EventRow) => void;
  style: ReturnType<typeof statusStyle>;
  top: number;
  height: number;
}) {
  return (
    <button
      key={evt.id}
      type="button"
      onClick={() => onEventClick?.(evt)}
      className={cn(
        "absolute left-1.5 right-1.5 z-10 overflow-hidden rounded-md border border-border/50 border-l-4 px-2.5 py-1.5 text-left text-xs shadow-sm transition-shadow hover:shadow-md",
        style.calendarEvent,
      )}
      style={{ top: top + 2, height: Math.max(height - 4, 52) }}
      title={`${evt.city}, ${evt.state}`}
    >
      <p className="truncate text-[11px] font-bold leading-tight">
        {evt.city}, {evt.state}
      </p>
      <p className="truncate text-[11px] opacity-90">{evt.vendorName}</p>
      <p className="truncate text-[10px] opacity-75">{formatWindow(evt.startTime, evt.endTime)}</p>
    </button>
  );
}

function TimeGrid({
  days,
  rows,
  onEventClick,
}: {
  days: Date[];
  rows: EventRow[];
  onEventClick?: (row: EventRow) => void;
}) {
  const hours = React.useMemo(
    () => Array.from({ length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 }, (_, i) => CALENDAR_START_HOUR + i),
    [],
  );
  const gridTop = CALENDAR_START_HOUR * 60;
  const gridBottom = (CALENDAR_END_HOUR + 1) * 60;
  const today = new Date();

  const eventsByDay = React.useMemo(() => {
    const map = new Map<number, EventRow[]>();
    for (let i = 0; i < days.length; i++) map.set(i, []);
    for (const evt of rows) {
      const idx = days.length === 1 ? 0 : dayIndexInWeek(evt.deliveryDate, days[0]);
      if (idx >= 0 && idx < days.length) map.get(idx)!.push(evt);
    }
    return map;
  }, [days, rows]);

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns:
      days.length === 1 ? "64px 1fr" : `64px repeat(${days.length}, minmax(0, 1fr))`,
  };

  return (
    <div className="min-w-[720px]">
      <div className="grid border-b bg-muted/40" style={gridStyle}>
        <div className="border-r px-2 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("All day")}
        </div>
        {days.map((day, i) => (
          <div
            key={`allday-${i}`}
            className={cn("min-h-9 border-l border-b bg-background px-1 py-1", sameDay(day, today) && "bg-primary/5")}
          />
        ))}
      </div>

      <div className="grid border-b bg-muted/30" style={gridStyle}>
        <div className="border-r" />
        {days.map((day, i) => {
          const isToday = sameDay(day, today);
          return (
            <div
              key={`head-${i}`}
              className={cn("border-l px-2 py-3 text-center", isToday && "bg-primary/5")}
            >
              <p className="text-xs text-muted-foreground">
                {day.toLocaleDateString(undefined, { weekday: "short" })}
              </p>
              <p className={cn("text-lg font-bold leading-tight", isToday && "text-primary")}>{day.getDate()}</p>
            </div>
          );
        })}
      </div>

      <div className="grid" style={gridStyle}>
        <div className="relative border-r">
          {hours.map((h) => (
            <div
              key={h}
              className="border-b px-2 text-right text-[11px] text-muted-foreground"
              style={{ height: CALENDAR_HOUR_HEIGHT }}
            >
              <span className="-mt-2 block">
                {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
              </span>
            </div>
          ))}
        </div>

        {days.map((day, dayIdx) => (
          <div key={dayIdx} className={cn("relative border-l", sameDay(day, today) && "bg-primary/[0.02]")}>
            {hours.map((h) => (
              <div key={h} className="border-b bg-background" style={{ height: CALENDAR_HOUR_HEIGHT }} />
            ))}

            {eventsByDay.get(dayIdx)?.map((evt) => {
              const startMin = parseTimeMinutes(evt.startTime) ?? 9 * 60;
              const endMin = parseTimeMinutes(evt.endTime) ?? startMin + 180;
              const top = ((Math.max(startMin, gridTop) - gridTop) / 60) * CALENDAR_HOUR_HEIGHT;
              const height =
                ((Math.min(endMin, gridBottom) - Math.max(startMin, gridTop)) / 60) * CALENDAR_HOUR_HEIGHT;
              return (
                <CalendarEventBlock
                  key={evt.id}
                  evt={evt}
                  onEventClick={onEventClick}
                  style={statusStyle(evt.status)}
                  top={top}
                  height={height}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthGrid({
  anchor,
  rows,
  onEventClick,
  onSelectDay,
}: {
  anchor: Date;
  rows: EventRow[];
  onEventClick?: (row: EventRow) => void;
  onSelectDay: (day: Date) => void;
}) {
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const today = new Date();
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="min-w-[720px]">
      <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="border-l px-2 py-2 first:border-l-0">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day) => {
          const inMonth = day.getMonth() === anchor.getMonth();
          const dayEvents = eventsOnDay(rows, day);
          const isToday = sameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[108px] border-b border-l bg-background p-1.5 first:border-l-0",
                !inMonth && "bg-muted/20",
                isToday && "bg-primary/5",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                className={cn(
                  "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  isToday && "bg-primary text-primary-foreground",
                  !isToday && "text-foreground hover:bg-muted",
                  !inMonth && !isToday && "text-muted-foreground",
                )}
              >
                {day.getDate()}
              </button>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((evt) => {
                  const style = statusStyle(evt.status);
                  return (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={() => onEventClick?.(evt)}
                      className={cn(
                        "block w-full truncate rounded border-l-[3px] px-1.5 py-0.5 text-left text-[10px] font-medium",
                        style.calendarEvent,
                      )}
                    >
                      {evt.city}, {evt.state}
                    </button>
                  );
                })}
                {dayEvents.length > 3 ? (
                  <p className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeliveryEventsCalendar({
  rows,
  weekStart,
  onWeekChange,
  onEventClick,
}: {
  rows: EventRow[];
  weekStart: Date;
  onWeekChange: (d: Date) => void;
  onEventClick?: (row: EventRow) => void;
}) {
  const [viewMode, setViewMode] = React.useState<CalendarViewMode>("week");
  const [focusDay, setFocusDay] = React.useState(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  });
  const [monthAnchor, setMonthAnchor] = React.useState(() => startOfMonth(new Date()));

  const weekDays = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = addDays(weekStart, 6);

  const weekRows = React.useMemo(() => {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const end = addDays(weekStart, 6);
    end.setHours(23, 59, 59, 999);
    return rows.filter((r) => {
      const d = eventDateOnly(r.deliveryDate);
      return d ? d >= start && d <= end : false;
    });
  }, [rows, weekStart]);

  const monthRows = React.useMemo(() => {
    const start = startOfMonth(monthAnchor);
    const end = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return rows.filter((r) => {
      const d = eventDateOnly(r.deliveryDate);
      return d ? d >= start && d <= end : false;
    });
  }, [rows, monthAnchor]);

  const dayRows = React.useMemo(() => eventsOnDay(rows, focusDay), [rows, focusDay]);

  const headerLabel = React.useMemo(() => {
    if (viewMode === "day") {
      return focusDay.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    if (viewMode === "month") {
      return monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }
    return `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }, [viewMode, focusDay, monthAnchor, weekStart, weekEnd]);

  const goToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    onWeekChange(startOfWeek(today));
    setFocusDay(today);
    setMonthAnchor(startOfMonth(today));
  };

  const goPrev = () => {
    if (viewMode === "day") {
      const next = addDays(focusDay, -1);
      setFocusDay(next);
      onWeekChange(startOfWeek(next));
      return;
    }
    if (viewMode === "month") {
      setMonthAnchor((m) => startOfMonth(addMonths(m, -1)));
      return;
    }
    onWeekChange(addDays(weekStart, -7));
  };

  const goNext = () => {
    if (viewMode === "day") {
      const next = addDays(focusDay, 1);
      setFocusDay(next);
      onWeekChange(startOfWeek(next));
      return;
    }
    if (viewMode === "month") {
      setMonthAnchor((m) => startOfMonth(addMonths(m, 1)));
      return;
    }
    onWeekChange(addDays(weekStart, 7));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={goToday}>
            {t("Today")}
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">{headerLabel}</span>
        </div>

        <div className="flex rounded-lg border bg-background p-0.5">
          {(["week", "month", "day"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                viewMode === mode
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              {mode === "week" ? t("Week") : mode === "month" ? t("Month") : t("Day")}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        {viewMode === "month" ? (
          <MonthGrid
            anchor={monthAnchor}
            rows={monthRows}
            onEventClick={onEventClick}
            onSelectDay={(day) => {
              setFocusDay(day);
              onWeekChange(startOfWeek(day));
              setViewMode("day");
            }}
          />
        ) : (
          <TimeGrid
            days={viewMode === "day" ? [focusDay] : weekDays}
            rows={viewMode === "day" ? dayRows : weekRows}
            onEventClick={onEventClick}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-5 border-t pt-4 text-xs text-muted-foreground">
        {(Object.entries(STATUS_STYLES) as [StatusKey, (typeof STATUS_STYLES)[StatusKey]][])
          .filter(([key]) => key !== "delivered")
          .map(([key, val]) => (
            <span key={key} className="inline-flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", val.dot)} />
              {val.label}
            </span>
          ))}
      </div>
    </div>
  );
}

export default function DeliveryEventsAdmin({
  canSchedule = false,
  apiBase = "/api/marketplace/admin",
}: {
  canSchedule?: boolean;
  apiBase?: string;
}) {
  const { settings } = useAppSettings();
  const [rows, setRows] = React.useState<EventRow[]>([]);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState<"list" | "calendar">("list");

  const [search, setSearch] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [cityFilter, setCityFilter] = React.useState("all");
  const [vendorFilter, setVendorFilter] = React.useState("all");
  const [driverFilter, setDriverFilter] = React.useState("all");
  const [rangeFrom, setRangeFrom] = React.useState("");
  const [rangeTo, setRangeTo] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);

  const [detailRow, setDetailRow] = React.useState<EventRow | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const [weekStart, setWeekStart] = React.useState(() => startOfWeek(new Date()));

  const money = (n: number) => formatCurrency(Number(n) || 0, settings);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/delivery-events`, { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setRows((data.items ?? []) as EventRow[]);
        setSummary((data.summary ?? null) as Summary | null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const cities = React.useMemo(
    () => [...new Set(rows.map((r) => `${r.city}, ${r.state}`))].sort(),
    [rows],
  );
  const vendors = React.useMemo(
    () => [...new Set(rows.map((r) => r.vendorName).filter(Boolean) as string[])].sort(),
    [rows],
  );
  const drivers = React.useMemo(
    () => [...new Set(rows.map((r) => r.driverName).filter(Boolean) as string[])].sort(),
    [rows],
  );

  const completedRevenue = React.useMemo(
    () =>
      Math.round(
        rows
          .filter((r) => r.status === "completed" || r.status === "delivered")
          .reduce((sum, r) => sum + r.totalRevenue, 0) * 100,
      ) / 100,
    [rows],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (cityFilter !== "all" && `${r.city}, ${r.state}` !== cityFilter) return false;
      if (vendorFilter !== "all" && r.vendorName !== vendorFilter) return false;
      if (driverFilter !== "all" && r.driverName !== driverFilter) return false;
      if (dateFilter !== "all" && !matchesDateFilter(r.deliveryDate, dateFilter)) return false;

      const eventDay = eventDateOnly(r.deliveryDate);
      if (rangeFrom && eventDay) {
        const from = eventDateOnly(rangeFrom);
        if (from && eventDay < from) return false;
      }
      if (rangeTo && eventDay) {
        const to = eventDateOnly(rangeTo);
        if (to && eventDay > to) return false;
      }

      if (!q) return true;
      const hay = [r.city, r.state, r.vendorName, r.driverName, r.driverPhone].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, dateFilter, statusFilter, cityFilter, vendorFilter, driverFilter, rangeFrom, rangeTo]);

  React.useEffect(() => {
    setPage(1);
  }, [search, dateFilter, statusFilter, cityFilter, vendorFilter, driverFilter, rangeFrom, rangeTo]);

  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, filtered.length);

  const openDetail = (row: EventRow) => {
    setDetailRow(row);
    setDetailOpen(true);
  };

  const exportCsv = () => {
    const header = ["Date", "Window", "City", "State", "Vendor", "Driver", "Orders", "Revenue", "Status"];
    const lines = filtered.map((r) => {
      const { date } = formatDateLong(r.deliveryDate);
      return [
        date,
        formatWindow(r.startTime, r.endTime),
        r.city,
        r.state,
        r.vendorName ?? "",
        r.driverName ?? "",
        String(r.orderCount),
        String(r.totalRevenue),
        r.status,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",");
    });
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "delivery-events.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const activeFilterCount =
    (dateFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (cityFilter !== "all" ? 1 : 0) +
    (vendorFilter !== "all" ? 1 : 0) +
    (driverFilter !== "all" ? 1 : 0) +
    (rangeFrom ? 1 : 0) +
    (rangeTo ? 1 : 0);

  return (
    <div className="space-y-6 pb-8">
      <p className="text-sm text-muted-foreground">
        {t("Track and manage all scheduled and completed delivery events.")}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          icon={<CalendarDays className="h-5 w-5 text-muted-foreground" />}
          label={t("Total Events")}
          value={String(summary?.total ?? rows.length)}
          sub={t("All delivery events")}
        />
        <StatCard
          icon={<Truck className="h-5 w-5 text-muted-foreground" />}
          label={t("Scheduled")}
          value={String(summary?.scheduled ?? 0)}
          sub={t("Upcoming events")}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-muted-foreground" />}
          label={t("Completed")}
          value={String(summary?.completed ?? 0)}
          sub={t("Delivered successfully")}
        />
        <StatCard
          icon={<XCircle className="h-5 w-5 text-muted-foreground" />}
          label={t("Cancelled")}
          value={String(summary?.cancelled ?? 0)}
          sub={t("Cancelled events")}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
          label={t("Total Revenue")}
          value={money(completedRevenue)}
          sub={t("From completed events")}
        />
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar")} className="space-y-0">
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pr-4">
            <TabsList className="h-auto w-full justify-start rounded-none border-0 bg-transparent p-0 sm:w-auto">
              <TabsTrigger
                value="list"
                className="gap-2 rounded-none border-b-2 border-transparent px-5 py-3.5 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <List className="h-4 w-4" />
                {t("List View")}
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="gap-2 rounded-none border-b-2 border-transparent px-5 py-3.5 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Calendar className="h-4 w-4" />
                {t("Calendar View")}
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-0 sm:pb-0">
              <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm">
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="h-8 w-[118px] border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 sm:w-[130px]"
                  aria-label={t("From date")}
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="h-8 w-[118px] border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 sm:w-[130px]"
                  aria-label={t("To date")}
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setFiltersOpen((v) => !v)}>
                <Filter className="mr-2 h-4 w-4" />
                {t("Filters")}
                {activeFilterCount > 0 ? (
                  <Badge variant="secondary" className="ml-2 h-5 min-w-5 rounded-full px-1.5 text-[10px]">
                    {activeFilterCount}
                  </Badge>
                ) : null}
              </Button>
              {canSchedule ? (
                <Button asChild size="sm">
                  <Link href="/admin/marketplace/delivery-queue">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("Schedule Delivery")}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

        <TabsContent value="list" className="mt-0 space-y-0">
          <div
            className={cn(
              "flex flex-col gap-3 border-b bg-muted/20 p-4 lg:flex-row lg:flex-wrap lg:items-center",
              !filtersOpen && "hidden sm:flex",
            )}
          >
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="bg-background pl-9"
                placeholder={t("Search by city, vendor, or driver...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full bg-background lg:w-[140px]">
                <SelectValue placeholder={t("Dates")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Dates")}</SelectItem>
                <SelectItem value="today">{t("Today")}</SelectItem>
                <SelectItem value="this_week">{t("This week")}</SelectItem>
                <SelectItem value="this_month">{t("This month")}</SelectItem>
                <SelectItem value="upcoming">{t("Upcoming")}</SelectItem>
                <SelectItem value="past">{t("Past")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-full bg-background lg:w-[150px]">
                <SelectValue placeholder={t("City")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Cities")}</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-full bg-background lg:w-[150px]">
                <SelectValue placeholder={t("Vendor")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Vendors")}</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-full bg-background lg:w-[140px]">
                <SelectValue placeholder={t("Driver")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Drivers")}</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full bg-background lg:w-[130px]">
                <SelectValue placeholder={t("Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Status")}</SelectItem>
                <SelectItem value="scheduled">{t("Scheduled")}</SelectItem>
                <SelectItem value="completed">{t("Completed")}</SelectItem>
                <SelectItem value="cancelled">{t("Cancelled")}</SelectItem>
                <SelectItem value="pending">{t("Pending")}</SelectItem>
                <SelectItem value="rescheduled">{t("Rescheduled")}</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" className="shrink-0 bg-background" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              {t("Export")}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>{t("Date & Time")}</TableHead>
                  <TableHead>{t("Window")}</TableHead>
                  <TableHead>{t("City")}</TableHead>
                  <TableHead>{t("Vendor")}</TableHead>
                  <TableHead>{t("Driver")}</TableHead>
                  <TableHead className="text-right">{t("Orders")}</TableHead>
                  <TableHead className="text-right">{t("Revenue")}</TableHead>
                  <TableHead>{t("Status")}</TableHead>
                  <TableHead className="text-right">{t("Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      {t("No delivery events found.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((row) => {
                    const { date, day } = formatDateLong(row.deliveryDate);
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50">
                              <CalendarDays className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="font-semibold">{date}</p>
                              {day ? <p className="text-xs text-muted-foreground">{day}</p> : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatWindow(row.startTime, row.endTime)}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {row.city}, {row.state}
                          </span>
                        </TableCell>
                        <TableCell>
                          {row.vendorName ? (
                            <span className="inline-flex items-center gap-2">
                              <InitialsAvatar
                                name={row.vendorName}
                              />
                              <span className="font-medium">{row.vendorName}</span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {row.driverName ? (
                            <span className="inline-flex items-center gap-2">
                              <InitialsAvatar
                                name={row.driverName}
                              />
                              <span>
                                <span className="block font-medium">{row.driverName}</span>
                                {row.driverPhone ? (
                                  <span className="text-xs text-muted-foreground">{formatPhoneDisplay(row.driverPhone)}</span>
                                ) : null}
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center justify-end gap-1.5 tabular-nums">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            {row.orderCount}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold tabular-nums">
                          {money(row.totalRevenue)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <TableActionButton
                            label={t("View")}
                            primaryIcon={<Eye className="h-4 w-4" />}
                            onPrimaryClick={() => openDetail(row)}
                            className="ml-auto"
                            items={[
                              { label: t("View"), onSelect: () => openDetail(row), icon: <Eye className="h-4 w-4" /> },
                              {
                                label: t("Go to delivery queue"),
                                href: "/admin/marketplace/delivery-queue",
                              },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 0 ? (
            <div className="border-t bg-muted/10 px-4 py-3">
              <Pagination
                page={page}
                lastPage={lastPage}
                total={filtered.length}
                from={from}
                to={to}
                onPageChange={setPage}
                entityLabel={t("events")}
              />
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="calendar" className="mt-0 p-4">
          {rows.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
              <CalendarClock className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p>{t("No delivery events scheduled yet.")}</p>
              {canSchedule ? (
                <Button asChild className="mt-4" variant="outline">
                  <Link href="/admin/marketplace/delivery-queue">{t("Schedule a delivery")}</Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <DeliveryEventsCalendar
              rows={filtered}
              weekStart={weekStart}
              onWeekChange={setWeekStart}
              onEventClick={openDetail}
            />
          )}
        </TabsContent>
        </div>
      </Tabs>

      <EventDetailSheet row={detailRow} open={detailOpen} onOpenChange={setDetailOpen} money={money} />
    </div>
  );
}
