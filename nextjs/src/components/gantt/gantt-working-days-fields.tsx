"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Clock } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TimeInput12h } from "@/components/ui/time-input-12h";
import { t } from "@/lib/admin-t";
import {
  buildDaySchedule,
  scheduleDayDurationLabel,
  type GanttDayScheduleEntry,
} from "@/lib/gantt-assignment-schedule";
import { formatGanttDisplayDate, formatGanttInputDate, parseGanttCalendarDate } from "@/lib/gantt-dates";
import {
  resolveStaffDayStatus,
  staffDayStatusColor,
  staffDayStatusLabel,
  type StaffAssignmentStatusInput,
} from "@/lib/gantt-staff-day-status";
import { cn } from "@/lib/utils";

const EXCLUDED_DAY_COLOR = "#E5E7EB";

export function GanttWorkingDaysFields({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  daySchedule,
  onDayScheduleChange,
  barColor = "#3B82F6",
  listMaxHeight,
  minDate,
  maxDate,
  showWorkingPeriod = true,
  showWorkingDaysList = true,
  staffAssignment,
  conflictDates,
}: {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  daySchedule: GanttDayScheduleEntry[];
  onDayScheduleChange: (schedule: GanttDayScheduleEntry[]) => void;
  barColor?: string;
  listMaxHeight?: string;
  minDate?: string | null;
  maxDate?: string | null;
  /** When false, hides start/end date fields (progressive add-staff flow). */
  showWorkingPeriod?: boolean;
  /** When false, hides the per-day schedule table. */
  showWorkingDaysList?: boolean;
  /** When set, day badges use staff day status colors (Gantt legend). */
  staffAssignment?: StaffAssignmentStatusInput | null;
  conflictDates?: Set<string>;
}) {
  const minDateVal = formatGanttInputDate(minDate);
  const maxDateVal = formatGanttInputDate(maxDate);

  const rangeValid = useMemo(() => {
    if (!startDate || !endDate) return false;
    const s = parseGanttCalendarDate(startDate);
    const e = parseGanttCalendarDate(endDate);
    return Boolean(s && e && s <= e);
  }, [startDate, endDate]);

  const displaySchedule = useMemo(() => {
    if (!rangeValid) return [];
    return buildDaySchedule(startDate, endDate, daySchedule);
  }, [rangeValid, startDate, endDate, daySchedule]);

  const enabledDays = displaySchedule.filter((d) => d.enabled).length;

  const durationDays = displaySchedule.length;

  const listHeightClass =
    listMaxHeight ??
    (displaySchedule.length > 5 ? "max-h-[min(50vh,20rem)]" : "max-h-none");

  const updateDay = (date: string, patch: Partial<GanttDayScheduleEntry>) => {
    const next = displaySchedule.map((row) => (row.date === date ? { ...row, ...patch } : row));
    onDayScheduleChange(next);
  };

  return (
    <>
      {showWorkingPeriod ? (
        <div className="space-y-1">
          <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {t("Working Period")}
          </div>
          <p className="text-xs text-muted-foreground">{t("Set when this person works at this location")}</p>
          <div className="flex gap-2">
            <div className="flex-1 space-y-0.5">
              <label className="text-xs text-muted-foreground">{t("Start Date")}</label>
              <Input
                type="date"
                value={startDate}
                min={minDateVal || undefined}
                max={endDate || maxDateVal || undefined}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="flex-1 space-y-0.5">
              <label className="text-xs text-muted-foreground">{t("End Date")}</label>
              <Input
                type="date"
                value={endDate}
                min={startDate || minDateVal || undefined}
                max={maxDateVal || undefined}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>
      ) : null}

      {showWorkingPeriod && startDate && endDate && !rangeValid ? (
        <p className="text-xs text-destructive">{t("End date must be on or after the start date.")}</p>
      ) : null}

      {showWorkingPeriod && rangeValid ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{t("Date Range Preview")}</p>
          <div className="h-4 w-full rounded" style={{ backgroundColor: barColor }} />
          <p className="text-right text-xs text-muted-foreground">
            {durationDays} {t("days")}
          </p>
        </div>
      ) : null}

      {showWorkingDaysList && rangeValid && displaySchedule.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold">{t("Select Working Days")}</p>
              <p className="text-[10px] text-muted-foreground">{t("Tap AM/PM to set shift times")}</p>
              <p className="mt-0.5 text-[10px] font-medium text-foreground/80">
                {formatGanttDisplayDate(startDate, "MMM d, yyyy")} – {formatGanttDisplayDate(endDate, "MMM d, yyyy")}
              </p>
            </div>
            <p className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {enabledDays}/{displaySchedule.length}
            </p>
          </div>

          <div className={cn("overflow-hidden overflow-y-auto rounded-lg border border-border/80 bg-muted/15", listHeightClass)}>
            <div className="sticky top-0 z-[1] grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem_1.5rem] items-center gap-x-1.5 border-b border-border/60 bg-muted/40 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>{t("Day")}</span>
              <span className="text-center">{t("Start – End")}</span>
              <span className="text-right">{t("Hrs")}</span>
              <span className="text-center" title={t("Include day")}>
                ✓
              </span>
            </div>

            {displaySchedule.map((day, idx) => {
              const parsed = parseGanttCalendarDate(day.date);
              const dayNum = parsed ? format(parsed, "d") : "?";
              const monthLabel = parsed ? format(parsed, "MMM").toUpperCase() : "";
              const weekday = parsed ? format(parsed, "EEE") : "";
              const duration = scheduleDayDurationLabel(day.startTime, day.endTime);
              const dayStatus =
                staffAssignment && day.enabled
                  ? resolveStaffDayStatus(staffAssignment, day.date, day, conflictDates)
                  : null;
              const rowTint = dayStatus
                ? staffDayStatusColor(dayStatus)
                : EXCLUDED_DAY_COLOR;
              const statusTitle = dayStatus
                ? staffDayStatusLabel(dayStatus)
                : day.enabled
                  ? t("Confirmed")
                  : t("Excluded");

              return (
                <div
                  key={day.date}
                  className={cn(
                    "grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem_1.5rem] items-center gap-x-1.5 border-b border-border/40 px-2 py-1.5 last:border-b-0",
                    idx % 2 === 0 ? "bg-background/80" : "bg-background",
                    !day.enabled && "opacity-45",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 flex-col items-center justify-center rounded-md shadow-sm ring-1 ring-black/10",
                      dayStatus === "begin" || dayStatus === "accept" ? "text-gray-800" : "text-white",
                      dayStatus === "begin" && "ring-gray-300",
                    )}
                    style={{ backgroundColor: rowTint }}
                    title={`${weekday} · ${statusTitle}`}
                  >
                    <span className="text-xs font-bold leading-none tabular-nums">{dayNum}</span>
                    <span className="mt-0.5 text-[7px] font-bold leading-none opacity-90">{monthLabel}</span>
                  </div>

                  <div className="flex min-w-0 items-center justify-center gap-1">
                    <TimeInput12h
                      dense
                      value={day.startTime}
                      onChange={(v) => updateDay(day.date, { startTime: v })}
                      disabled={!day.enabled}
                      aria-label={t("Start Time")}
                    />
                    <span className="shrink-0 text-[11px] font-medium text-muted-foreground/80">–</span>
                    <TimeInput12h
                      dense
                      value={day.endTime}
                      onChange={(v) => updateDay(day.date, { endTime: v })}
                      disabled={!day.enabled}
                      aria-label={t("End Time")}
                    />
                  </div>

                  <span
                    className="truncate text-right text-[10px] font-medium tabular-nums text-muted-foreground"
                    title={duration}
                  >
                    {duration}
                  </span>

                  <div className="flex justify-center">
                    <Checkbox
                      id={`add-day-${day.date}`}
                      checked={day.enabled}
                      onCheckedChange={(checked) => updateDay(day.date, { enabled: checked === true })}
                      className="h-4 w-4"
                      aria-label={t("Include day")}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
