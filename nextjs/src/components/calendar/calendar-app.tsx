"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  HelpCircle,
  MapPin,
  Users,
  X,
} from "lucide-react";

import { useAppSettings } from "@/contexts/app-settings-context";
import {
  type CalendarEvent,
  colorClass,
  eventsByDate,
} from "@/lib/calendar-data";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function fmtDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const am = h < 12;
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${am ? "AM" : "PM"}`;
}

/**
 * Apple-style appointments calendar mounted at `/storefront/events-schedule`. Receives the live
 * `storefront_events` rows (already mapped to `CalendarEvent`) from the parent Server Component
 * and renders the month grid + day rail + status donut + bottom sheet against them. The original
 * integration drop hard-coded a sample `events` array; we replaced that with a prop so the
 * calendar always reflects the same data the rest of the storefront sees.
 */
export default function CalendarApp({ events }: { events: CalendarEvent[] }) {
  /** Settings from `<AuthenticatedLayout>`'s `<AppSettingsProvider>`; drives the project-wide
   * date format (System → date format), so the schedule view renders dates the same way the rest
   * of the admin (orders, blog, products, etc.) does instead of leaking raw `YYYY-MM-DD`. */
  const { settings } = useAppSettings();
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const initialSelected = useMemo(() => {
    const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate());
    if (events.some((e) => e.date === todayStr)) return todayStr;
    const upcoming = [...events].sort((a, b) => a.date.localeCompare(b.date)).find((e) => e.date >= todayStr);
    return upcoming?.date ?? todayStr;
    // Initial selected only — recomputing on cursor changes would fight the user's clicks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selected, setSelected] = useState<string>(initialSelected);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [tab, setTab] = useState<"details" | "time" | "rsvp" | "address">("details");

  const grid = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells: { date: string; day: number; inMonth: boolean }[] = [];
    const prevDays = new Date(cursor.y, cursor.m, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({
        date: fmtDate(cursor.y, cursor.m - 1, prevDays - i),
        day: prevDays - i,
        inMonth: false,
      });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: fmtDate(cursor.y, cursor.m, day), day, inMonth: true });
    }
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({
        date: fmtDate(cursor.y, cursor.m + 1, nextDay),
        day: nextDay,
        inMonth: false,
      });
      nextDay++;
    }
    return cells;
  }, [cursor]);

  const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate());
  const dayEvents = useMemo(() => eventsByDate(selected, events), [selected, events]);

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const nm = c.m + delta;
      return { y: c.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
    });
  }

  /**
   * Status distribution. The events table doesn't carry an explicit RSVP/attendance lifecycle
   * yet, so we synthesise three buckets from event_date relative to today:
   *   - upcoming   → "pending"   (amber)
   *   - happening today → "confirmed" (sky)
   *   - past        → "completed" (slate)
   * This stays useful as a calendar-at-a-glance summary without inventing data the DB doesn't have.
   */
  const statusCounts = useMemo(() => {
    const counts = { confirmed: 0, pending: 0, completed: 0 };
    for (const e of events) {
      if (e.date === todayStr) counts.confirmed++;
      else if (e.date > todayStr) counts.pending++;
      else counts.completed++;
    }
    return counts;
  }, [events, todayStr]);

  const recent = useMemo(
    () => [...events].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [events],
  );

  function openEvent(ev: CalendarEvent) {
    setActiveEvent(ev);
    setTab("details");
  }

  return (
    <div className="text-foreground" style={{ fontFamily: "var(--font-display)" }}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Calendar card */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <CalendarIcon className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">Appointments Calendar</h2>
            </div>

            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shiftMonth(-1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm transition hover:bg-sky-600"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => shiftMonth(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm transition hover:bg-sky-600"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setCursor({ y: today.getFullYear(), m: today.getMonth() });
                    setSelected(todayStr);
                  }}
                  className="ml-1 h-9 rounded-lg border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted"
                >
                  Today
                </button>
              </div>
              <h3 className="text-lg font-semibold tracking-tight">
                {MONTHS[cursor.m]} {cursor.y}
              </h3>
              <div className="w-[180px]" />
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-7 border-b border-border bg-muted/40">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {grid.map((cell, idx) => {
                  const dayEv = eventsByDate(cell.date, events);
                  const isToday = cell.date === todayStr;
                  const isSelected = cell.date === selected;
                  const isLastRow = idx >= grid.length - 7;
                  const isLastCol = (idx + 1) % 7 === 0;
                  return (
                    <button
                      key={cell.date + idx}
                      onClick={() => setSelected(cell.date)}
                      className={cn(
                        "group relative h-24 p-2 text-left transition-colors sm:h-28",
                        !isLastCol && "border-r border-border",
                        !isLastRow && "border-b border-border",
                        !cell.inMonth && "bg-muted/20",
                        isSelected && "bg-sky-50",
                        "hover:bg-muted/40",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                          !cell.inMonth && "text-muted-foreground/50",
                          isToday && "bg-sky-500 text-white",
                        )}
                      >
                        {cell.day}
                      </span>
                      {dayEv.length > 0 && cell.inMonth && (
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                          <div className="flex gap-1">
                            {dayEv.slice(0, 3).map((e) => (
                              <span
                                key={e.id}
                                className={cn("h-1.5 w-1.5 rounded-full", colorClass(e.color))}
                              />
                            ))}
                          </div>
                          <span className="rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-sky-700">
                            {dayEv.length}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Right column */}
        <aside className="space-y-6">
          {/* Day events */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">
                  {new Date(selected + "T00:00").toLocaleDateString(undefined, { weekday: "long" })}
                </p>
                <h3 className="text-lg font-semibold tracking-tight">
                  {new Date(selected + "T00:00").toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
              </span>
            </div>
            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {dayEvents.map((ev, i) => (
                  <motion.button
                    key={ev.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => openEvent(ev)}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-muted/60"
                  >
                    <div
                      className={cn("w-1 shrink-0 self-stretch rounded-full", colorClass(ev.color))}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{ev.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{ev.location}</p>
                    </div>
                    <div className="shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                      <div className="font-medium text-foreground">{fmt12(ev.startTime)}</div>
                      <div>{fmt12(ev.endTime)}</div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
              {dayEvents.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">No events scheduled</div>
              )}
            </div>
          </div>

          {/* Status distribution */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" />
              <h3 className="text-base font-semibold">Status Distribution</h3>
            </div>
            <Donut counts={statusCounts} />
            <div className="mt-4 space-y-2">
              <LegendRow color="bg-sky-500" label="Today" count={statusCounts.confirmed} chip="bg-sky-500" />
              <LegendRow color="bg-amber-500" label="Upcoming" count={statusCounts.pending} chip="bg-amber-500" />
              <LegendRow
                color="bg-slate-400"
                label="Past"
                count={statusCounts.completed}
                chip="bg-slate-400"
              />
            </div>
          </div>

          {/* Recent schedules */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <h3 className="text-base font-semibold">Recent Schedules</h3>
            </div>
            <div className="space-y-3">
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events to show yet.</p>
              ) : (
                recent.map((ev) => {
                  const status = ev.date === todayStr ? "today" : ev.date > todayStr ? "upcoming" : "past";
                  return (
                    <button
                      key={ev.id}
                      onClick={() => openEvent(ev)}
                      className="group flex w-full items-start justify-between gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold transition group-hover:text-sky-600">
                          {ev.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{ev.location}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {formatDate(ev.date, settings)} · {fmt12(ev.startTime)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                          status === "today" && "bg-sky-500 text-white",
                          status === "upcoming" && "bg-amber-500 text-white",
                          status === "past" && "bg-slate-400/80 text-white",
                        )}
                      >
                        {status}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom slider */}
      <Sheet open={!!activeEvent} onOpenChange={(o) => !o && setActiveEvent(null)}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-0 p-0"
        >
          {activeEvent && (
            <div>
              <div className={cn("h-1.5", colorClass(activeEvent.color))} />
              <div className="p-6 sm:p-8">
                <SheetHeader className="mb-6 text-left">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", colorClass(activeEvent.color))} />
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Event
                    </span>
                  </div>
                  <SheetTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {activeEvent.title}
                  </SheetTitle>
                  <SheetDescription className="text-base">
                    {fmt12(activeEvent.startTime)} – {fmt12(activeEvent.endTime)} ·{" "}
                    {activeEvent.location}
                  </SheetDescription>
                </SheetHeader>

                <div className="mb-6 flex w-fit flex-wrap gap-1 rounded-xl bg-muted p-1">
                  {(
                    [
                      { id: "details", label: "Details" },
                      { id: "time", label: "Date & Time" },
                      { id: "rsvp", label: "RSVP" },
                      { id: "address", label: "Address" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={cn(
                        "rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
                        tab === t.id
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="min-h-[200px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tab}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                    >
                      {tab === "details" && (
                        <div className="space-y-4">
                          <p className="leading-relaxed text-foreground/90">
                            {activeEvent.description || "No description provided yet."}
                          </p>
                          <div className="flex items-start gap-3 pt-2">
                            <Users className="mt-0.5 h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="mb-1 text-sm font-semibold">Attendees</p>
                              {activeEvent.attendees.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  RSVPs aren&apos;t tracked for this event yet.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {activeEvent.attendees.map((a) => (
                                    <span key={a} className="rounded-full bg-muted px-3 py-1 text-sm">
                                      {a}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      {tab === "time" && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
                            <CalendarIcon className="h-5 w-5 text-sky-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Date</p>
                              <p className="font-semibold">
                                {new Date(activeEvent.date + "T00:00").toLocaleDateString(undefined, {
                                  weekday: "long",
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
                            <Clock className="h-5 w-5 text-sky-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Time</p>
                              <p className="font-semibold">
                                {fmt12(activeEvent.startTime)} – {fmt12(activeEvent.endTime)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {tab === "rsvp" && (
                        <div className="space-y-4">
                          <p className="text-muted-foreground">Will you attend?</p>
                          <div className="grid grid-cols-3 gap-3">
                            {/* TODO: Wire RSVP buttons to a real attendance API once one ships. */}
                            <button
                              type="button"
                              className="flex flex-col items-center gap-2 rounded-xl bg-emerald-500/10 p-4 transition hover:bg-emerald-500/20"
                            >
                              <Check className="h-6 w-6 text-emerald-600" />
                              <span className="text-sm font-semibold">Going</span>
                            </button>
                            <button
                              type="button"
                              className="flex flex-col items-center gap-2 rounded-xl bg-amber-500/10 p-4 transition hover:bg-amber-500/20"
                            >
                              <HelpCircle className="h-6 w-6 text-amber-600" />
                              <span className="text-sm font-semibold">Maybe</span>
                            </button>
                            <button
                              type="button"
                              className="flex flex-col items-center gap-2 rounded-xl bg-rose-500/10 p-4 transition hover:bg-rose-500/20"
                            >
                              <X className="h-6 w-6 text-rose-600" />
                              <span className="text-sm font-semibold">Decline</span>
                            </button>
                          </div>
                        </div>
                      )}
                      {tab === "address" && (
                        <div className="space-y-3">
                          <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
                            <MapPin className="mt-0.5 h-5 w-5 text-sky-500" />
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground">Location</p>
                              <p className="font-semibold">{activeEvent.location}</p>
                              <p className="text-sm text-muted-foreground">{activeEvent.address}</p>
                            </div>
                          </div>
                          {activeEvent.mapQuery && (
                            <div className="aspect-[16/9] overflow-hidden rounded-xl border border-border bg-muted">
                              <iframe
                                title="map"
                                className="h-full w-full"
                                src={`https://www.google.com/maps?q=${encodeURIComponent(
                                  activeEvent.mapQuery,
                                )}&output=embed`}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Donut({
  counts,
}: {
  counts: { confirmed: number; pending: number; completed: number };
}) {
  const total = counts.confirmed + counts.pending + counts.completed || 1;
  const segs = [
    { value: counts.confirmed, color: "#0ea5e9" },
    { value: counts.pending, color: "#f59e0b" },
    { value: counts.completed, color: "#94a3b8" },
  ];
  const r = 60;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="22"
          className="opacity-30"
        />
        {segs.map((s, i) => {
          const len = (s.value / total) * c;
          const el = (
            <circle
              key={i}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="22"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
    </div>
  );
}

function LegendRow({
  color,
  label,
  count,
  chip,
}: {
  color: string;
  label: string;
  count: number;
  chip: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
        <span className="text-foreground/80">{label}</span>
      </div>
      <span
        className={cn(
          "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold text-white",
          chip,
        )}
      >
        {count}
      </span>
    </div>
  );
}
