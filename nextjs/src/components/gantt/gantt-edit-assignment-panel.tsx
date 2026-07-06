"use client";

import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import { Clock, X } from "lucide-react";

import type {
  GanttProject,
  GanttProjectLocation,
  GanttProjectStaff,
  GanttProjectSub,
  GanttStaff,
  GanttSub,
} from "@/components/gantt/gantt-types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimeInput12h } from "@/components/ui/time-input-12h";
import { t } from "@/lib/admin-t";
import {
  buildDaySchedule,
  parseAssignmentSchedule,
  scheduleDayDurationLabel,
  type GanttDayScheduleEntry,
} from "@/lib/gantt-assignment-schedule";
import { formatGanttDisplayDate, formatGanttInputDate, parseGanttCalendarDate } from "@/lib/gantt-dates";
import {
  computeGanttAssignmentSpan,
  detectGanttEventDateExtensionConflict,
  resolveGanttEventBounds,
} from "@/lib/gantt-event-date-conflict";
import {
  buildGanttStaffConflictDateMap,
  GANTT_STAFF_DAY_STATUS_ORDER,
  resolveStaffDayStatus,
  staffDayStatusColor,
  staffDayStatusLabel,
  type GanttClockEntry,
} from "@/lib/gantt-staff-day-status";
import { cn } from "@/lib/utils";

function fmtShort(s: string | null): string {
  return formatGanttDisplayDate(s, "MMM d");
}

export function GanttEditAssignmentPanel({
  assignment,
  assignmentType,
  project,
  location,
  staffList,
  subsList,
  clockMap,
  focusedDate,
  onUpdate,
  onDelete,
  onClose,
}: {
  assignment: GanttProjectStaff | GanttProjectSub;
  assignmentType: "staff" | "sub";
  project: GanttProject;
  location: GanttProjectLocation | null;
  staffList: GanttStaff[];
  subsList: GanttSub[];
  clockMap: Map<string, GanttClockEntry>;
  focusedDate?: string | null;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const isStaff = assignmentType === "staff";
  const sa = assignment as GanttProjectStaff;
  const ua = assignment as GanttProjectSub;
  const [memberId, setMemberId] = useState(isStaff ? (sa.staffId ?? "__none__") : (ua.subId ?? "__none__"));
  const [startDate, setStartDate] = useState(formatGanttInputDate(assignment.startDate));
  const [endDate, setEndDate] = useState(formatGanttInputDate(assignment.endDate));
  const initialSchedule = useMemo(
    () => parseAssignmentSchedule(assignment.label) ?? [],
    [assignment.label],
  );
  const [daySchedule, setDaySchedule] = useState<GanttDayScheduleEntry[]>(() =>
    buildDaySchedule(
      formatGanttInputDate(assignment.startDate),
      formatGanttInputDate(assignment.endDate),
      initialSchedule,
    ),
  );
  const [notifyStaff, setNotifyStaff] = useState(true);
  const [extendEventDates, setExtendEventDates] = useState(false);
  const list = isStaff ? staffList : subsList;

  const conflictDates = useMemo(() => {
    if (!isStaff) return undefined;
    const rows = [
      ...project.staffAssignments.map((row) => ({
        id: row.id,
        staffId: row.staffId,
        label: row.label,
        startDate: row.startDate,
        endDate: row.endDate,
      })),
      ...project.locations.flatMap((loc) =>
        loc.staffAssignments.map((row) => ({
          id: row.id,
          staffId: row.staffId,
          label: row.label,
          startDate: row.startDate,
          endDate: row.endDate,
        })),
      ),
    ];
    return buildGanttStaffConflictDateMap(rows).get(assignment.id);
  }, [isStaff, project, assignment.id]);

  useEffect(() => {
    setDaySchedule((prev) => buildDaySchedule(startDate, endDate, prev.length ? prev : initialSchedule));
  }, [startDate, endDate, initialSchedule]);

  useEffect(() => {
    if (!focusedDate) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`gantt-day-${focusedDate}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [focusedDate, daySchedule.length]);

  const conflicts = useMemo(() => {
    if (!isStaff) return [];
    if (!startDate || !endDate) return [];
    const selectedId = memberId === "__none__" ? null : memberId;
    if (!selectedId) return [];

    const sdRaw = parseGanttCalendarDate(startDate);
    const edRaw = parseGanttCalendarDate(endDate);
    if (!sdRaw || !edRaw) return [];
    const sd = startOfDay(sdRaw);
    const ed = startOfDay(edRaw);

    type Conflict = { id: string; locationName: string; projectName: string; start: string | null; end: string | null };
    const results: Conflict[] = [];

    const overlaps = (aStart: string | null, aEnd: string | null) => {
      const ps = parseGanttCalendarDate(aStart);
      const pe = parseGanttCalendarDate(aEnd);
      if (!ps || !pe) return false;
      const s1 = startOfDay(ps);
      const e1 = startOfDay(pe);
      return s1 <= ed && sd <= e1;
    };

    for (const other of project.staffAssignments) {
      if (other.id === assignment.id) continue;
      if (other.staffId !== selectedId) continue;
      if (!overlaps(other.startDate, other.endDate)) continue;
      results.push({
        id: other.id,
        locationName: "—",
        projectName: project.name,
        start: other.startDate,
        end: other.endDate,
      });
    }

    for (const loc of project.locations) {
      for (const other of loc.staffAssignments) {
        if (other.id === assignment.id) continue;
        if (other.staffId !== selectedId) continue;
        if (!overlaps(other.startDate, other.endDate)) continue;
        results.push({
          id: other.id,
          locationName: loc.name,
          projectName: project.name,
          start: other.startDate,
          end: other.endDate,
        });
      }
    }

    return results;
  }, [isStaff, memberId, startDate, endDate, project, assignment.id]);

  const durationDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = parseGanttCalendarDate(startDate);
    const e = parseGanttCalendarDate(endDate);
    if (!s || !e) return 0;
    return Math.max(0, differenceInCalendarDays(e, s) + 1);
  }, [startDate, endDate]);

  const member = list.find((m) => m.id === memberId);
  const barColor = member?.color ?? (isStaff ? "#3B82F6" : "#8B5CF6");
  const enabledDays = daySchedule.filter((d) => d.enabled).length;
  const resolvedLocation = useMemo(() => {
    if (location) return location;
    const locId = assignment.locationId;
    if (!locId) return null;
    return project.locations.find((loc) => loc.id === locId) ?? null;
  }, [location, assignment.locationId, project.locations]);

  const eventDateConflict = useMemo(() => {
    if (!isStaff) return null;
    const assignmentSpan = computeGanttAssignmentSpan(startDate, endDate, daySchedule);
    const eventBounds = resolveGanttEventBounds({
      projectStartDate: project.startDate,
      projectEndDate: project.endDate,
      locationStartDate: resolvedLocation?.startDate ?? null,
      locationEndDate: resolvedLocation?.endDate ?? null,
      locationName: resolvedLocation?.name ?? null,
    });
    return detectGanttEventDateExtensionConflict({ assignmentSpan, eventBounds });
  }, [isStaff, startDate, endDate, daySchedule, project, resolvedLocation]);

  useEffect(() => {
    if (!eventDateConflict?.exceedsEventDates) setExtendEventDates(false);
  }, [eventDateConflict?.exceedsEventDates]);

  const updateDay = (date: string, patch: Partial<GanttDayScheduleEntry>) => {
    setDaySchedule((prev) => prev.map((row) => (row.date === date ? { ...row, ...patch } : row)));
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold">{t("Edit Assignment")}</h3>
        <div className="flex shrink-0 items-center gap-2">
          {resolvedLocation ? (
            <span className="inline-flex max-w-[10rem] items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-[11px] font-medium text-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: resolvedLocation.color ?? "#6366F1" }}
              />
              <span className="truncate">{resolvedLocation.name}</span>
            </span>
          ) : (
            <span className="rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
              {t("Project-level")}
            </span>
          )}
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: barColor }} />
          <span className="text-sm font-medium">{member?.name ?? t("Unassigned")}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("Project:")} {project.name}
        </p>
        {focusedDate ? (
          <p className="mt-0.5 text-xs font-medium text-primary">
            {t("Selected day:")} {fmtShort(focusedDate)}
          </p>
        ) : null}
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">{isStaff ? t("Staff Member") : t("Subcontractor")}</label>
        <Select value={memberId} onValueChange={setMemberId}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder={isStaff ? "Select staff" : "Select sub"} />
          </SelectTrigger>
          <SelectContent
            searchable
            searchPlaceholder={isStaff ? t("Search staff...") : t("Search sub-contractors...")}
            position="popper"
            className="max-h-72"
          >
            <SelectItem value="__none__">{isStaff ? t("No Staff") : t("No Sub")}</SelectItem>
            {list.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {t("Working Period")}
        </div>
        <p className="text-xs text-muted-foreground">{t("Set when this person works at this location")}</p>
        <div className="flex gap-2">
          <div className="flex-1 space-y-0.5">
            <label className="text-xs text-muted-foreground">{t("Start Date")}</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="flex-1 space-y-0.5">
            <label className="text-xs text-muted-foreground">{t("End Date")}</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 text-xs" />
          </div>
        </div>
      </div>
      {startDate && endDate && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{t("Date Range Preview")}</p>
          <div className="h-4 w-full rounded" style={{ backgroundColor: barColor }} />
          <p className="text-right text-xs text-muted-foreground">
            {durationDays} {t("days")}
          </p>
        </div>
      )}
      {startDate && endDate && daySchedule.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold">{t("Select Working Days")}</p>
              <p className="text-[10px] text-muted-foreground">{t("Tap AM/PM to set shift times")}</p>
            </div>
            <p className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {enabledDays}/{daySchedule.length}
            </p>
          </div>

          <div className="max-h-[min(50vh,20rem)] overflow-y-auto overflow-x-hidden rounded-lg border border-border/80 bg-muted/15">
            <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem_1.5rem] items-center gap-x-1.5 border-b border-border/60 bg-muted/40 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>{t("Day")}</span>
              <span className="text-center">{t("Start – End")}</span>
              <span className="text-right">{t("Hrs")}</span>
              <span className="text-center" title={t("Include day")}>
                ✓
              </span>
            </div>

            {daySchedule.map((day, idx) => {
              const parsed = parseGanttCalendarDate(day.date);
              const dayNum = parsed ? format(parsed, "d") : "?";
              const monthLabel = parsed ? format(parsed, "MMM").toUpperCase() : "";
              const weekday = parsed ? format(parsed, "EEE") : "";
              const duration = scheduleDayDurationLabel(day.startTime, day.endTime);
              const dayStatus =
                isStaff && day.enabled
                  ? resolveStaffDayStatus(
                      {
                        id: assignment.id,
                        approvalStatus: sa.approvalStatus,
                        notifiedAt: sa.notifiedAt,
                      },
                      day.date,
                      day,
                      conflictDates,
                    )
                  : null;
              const rowTint = dayStatus ? staffDayStatusColor(dayStatus) : "#E5E7EB";
              const statusTitle = dayStatus
                ? staffDayStatusLabel(dayStatus)
                : day.enabled
                  ? t("Confirmed")
                  : t("Excluded");
              const isFocused = focusedDate === day.date;

              return (
                <div
                  key={day.date}
                  id={`gantt-day-${day.date}`}
                  className={cn(
                    "grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem_1.5rem] items-center gap-x-1.5 border-b border-border/40 px-2 py-1.5 last:border-b-0",
                    idx % 2 === 0 ? "bg-background/80" : "bg-background",
                    !day.enabled && "opacity-45",
                    isFocused && "ring-2 ring-inset ring-primary/70",
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
                      id={`day-${day.date}`}
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

          <div className="flex flex-wrap items-center gap-3 px-0.5 text-[10px] text-muted-foreground">
            {GANTT_STAFF_DAY_STATUS_ORDER.map((status) => (
              <span key={status} className="inline-flex items-center gap-1">
                <span
                  className={cn(
                    "h-2 w-2 rounded-sm",
                    status === "begin" ? "ring-1 ring-gray-300" : "ring-1 ring-black/10",
                  )}
                  style={{ backgroundColor: staffDayStatusColor(status) }}
                />
                {t(staffDayStatusLabel(status))}
              </span>
            ))}
          </div>
        </div>
      )}
      {isStaff && eventDateConflict?.exceedsEventDates && (
        <div className="space-y-2 rounded-md border border-blue-300/80 bg-blue-50/90 px-3 py-2.5">
          <p className="text-xs font-semibold text-blue-950">
            {t("Event date conflict — assignment extends beyond the event window")}
          </p>
          <p className="text-[11px] leading-relaxed text-blue-900/90">
            {resolvedLocation
              ? t("Location") + ` “${resolvedLocation.name}” ` + t("ends") + ` ${fmtShort(resolvedLocation.endDate ?? project.endDate)}. `
              : t("Project") + ` “${project.name}” ` + t("ends") + ` ${fmtShort(project.endDate)}. `}
            {t("Working days through")} {fmtShort(eventDateConflict.assignmentSpan.end)} {t("require admin approval to extend event dates.")}
          </p>
          <div className="flex items-start gap-2 rounded-md border border-blue-200/80 bg-white/70 px-2.5 py-2">
            <Checkbox
              id="extend-event-dates"
              checked={extendEventDates}
              onCheckedChange={(checked) => setExtendEventDates(checked === true)}
            />
            <label htmlFor="extend-event-dates" className="cursor-pointer text-[11px] leading-snug text-blue-950">
              {t("Approve and extend event dates to")}{" "}
              <strong>{fmtShort(eventDateConflict.proposedProjectEnd)}</strong>
              {eventDateConflict.proposedLocationEnd &&
              eventDateConflict.proposedLocationEnd !== eventDateConflict.proposedProjectEnd ? (
                <>
                  {" "}
                  ({t("location to")} <strong>{fmtShort(eventDateConflict.proposedLocationEnd)}</strong>)
                </>
              ) : null}
            </label>
          </div>
        </div>
      )}
      {isStaff && conflicts.length > 0 && (
        <div className="space-y-1 rounded-md border border-amber-300/70 bg-amber-50/80 px-3 py-2">
          <p className="text-xs font-semibold text-amber-900">
            {t("Scheduling conflict detected for this staff member")}
          </p>
          <ul className="space-y-0.5">
            {conflicts.map((c) => (
              <li key={c.id} className="flex justify-between gap-2 text-[11px] text-amber-900/90">
                <span className="truncate">
                  {c.locationName !== "—" ? `${c.locationName}` : t("Project-level assignment")}
                </span>
                <span className="shrink-0 tabular-nums">
                  {fmtShort(c.start)} - {fmtShort(c.end)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {isStaff && (
        <div className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2">
          <Checkbox
            id="notify-staff"
            checked={notifyStaff}
            onCheckedChange={(checked) => setNotifyStaff(checked === true)}
          />
          <label htmlFor="notify-staff" className="cursor-pointer text-xs text-muted-foreground">
            {t("Notify staff by email or text when saving")}
          </label>
        </div>
      )}
      <Button
        className="w-full"
        disabled={Boolean(isStaff && eventDateConflict?.exceedsEventDates && !extendEventDates)}
        onClick={() =>
          onUpdate({
            ...(isStaff ? { staffId: memberId === "__none__" ? null : memberId } : { subId: memberId === "__none__" ? null : memberId }),
            startDate: startDate || null,
            endDate: endDate || null,
            daySchedule,
            ...(isStaff ? { notifyStaff } : {}),
            ...(isStaff && extendEventDates ? { extendEventDates: true } : {}),
          })
        }
      >
        {eventDateConflict?.exceedsEventDates && extendEventDates
          ? t("Save & extend event dates")
          : t("Save Changes")}
      </Button>
      <button type="button" onClick={onDelete} className="mt-auto text-left text-xs text-destructive hover:underline">
        {t("Delete Assignment")}
      </button>
    </div>
  );
}
