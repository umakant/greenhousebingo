"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  format, isToday, isSameDay,
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfDay, subDays, subMonths, startOfYear,
  differenceInCalendarDays,
} from "date-fns";
import { toast } from "sonner";
import { X, Settings, ChevronRight, ChevronDown, Plus, Trash2, Calendar, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { GanttEditAssignmentPanel } from "@/components/gantt/gantt-edit-assignment-panel";
import { GanttWorkingDaysFields } from "@/components/gantt/gantt-working-days-fields";
import { ProjectDrawer } from "@/components/projects/project-drawer";
import { TimeInput12h } from "@/components/ui/time-input-12h";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { t } from "@/lib/admin-t";
import { cn } from "@/lib/utils";
import {
  formatGanttDisplayDate,
  formatGanttInputDate,
  parseGanttCalendarDate,
  coalesceGanttDate,
} from "@/lib/gantt-dates";
import {
  buildGanttLocationMapQuery,
  normalizeGanttLongitudeForUsState,
  parseGanttCoordinate,
} from "@/lib/gantt-location-address";
import {
  buildDaySchedule,
  isStaffScheduleDayConfirmed,
  parseAssignmentSchedule,
  resolveStaffAssignmentSchedule,
  scheduleDayDurationLabel,
  type GanttDayScheduleEntry,
} from "@/lib/gantt-assignment-schedule";
import {
  buildGanttClockMap,
  buildGanttStaffConflictDateMap,
  buildStaffScheduleConflictDates,
  GANTT_STAFF_DAY_STATUS_ORDER,
  resolveStaffDayStatus,
  staffDayStatusColor,
  staffDayStatusLabel,
  type GanttClockEntry,
} from "@/lib/gantt-staff-day-status";
import { dedupeGanttStaffList } from "@/lib/gantt-staff-dedupe";

type GanttStaff = { id: string; name: string; color: string | null; email?: string | null };
type GanttSub = { id: string; name: string; color: string | null; email?: string | null };

type GanttProjectStaff = {
  id: string; projectId: string; locationId: string | null; staffId: string | null;
  label?: string;
  startDate: string | null; endDate: string | null; approvalStatus: string;
  notifiedAt: string | null; staff: GanttStaff | null;
};
type GanttProjectSub = {
  id: string; projectId: string; locationId: string | null; subId: string | null;
  label?: string;
  startDate: string | null; endDate: string | null;
  sub: GanttSub | null;
};
type GanttProjectLocation = {
  id: string; projectId: string; name: string; color: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  startDate: string | null; endDate: string | null;
  showLocationMap?: boolean;
  staffAssignments: GanttProjectStaff[];
  subAssignments: GanttProjectSub[];
};
type GanttProject = {
  id: string; name: string; color: string | null; status: string | null;
  startDate: string; endDate: string; clientId: string | null;
  projectRefId: number | null;
  createdAt: string;
  locations: GanttProjectLocation[];
  staffAssignments: GanttProjectStaff[];
  subAssignments: GanttProjectSub[];
};

type DetailDrawer =
  | { type: "project"; project: GanttProject }
  | { type: "location"; location: GanttProjectLocation; project: GanttProject }
  | {
      type: "assignment";
      assignment: GanttProjectStaff | GanttProjectSub;
      assignmentType: "staff" | "sub";
      project: GanttProject;
      location: GanttProjectLocation | null;
      focusedDate?: string | null;
    };

type DeleteTarget =
  | { type: "project"; id: string; name: string }
  | { type: "location"; id: string; name: string }
  | { type: "assignment"; id: string; name: string; assignmentType: "staff" | "sub" };

// ────── Helpers ───────────────────────────────────────────────────────────────

function fmtDisplay(s: string | null): string {
  return formatGanttDisplayDate(s, "MMM d, yyyy");
}

function fmtShort(s: string | null): string {
  return formatGanttDisplayDate(s, "MMM d");
}

/** Staff/sub timeline bars: inherit location → project dates when missing; clamp to location/project window so rows align from the project start. */
function assignmentBarRange(
  aStart: string | null,
  aEnd: string | null,
  loc: GanttProjectLocation,
  project: GanttProject,
): { start: string | null; end: string | null } {
  const winS = parseGanttCalendarDate(coalesceGanttDate(loc.startDate, project.startDate));
  const winE = parseGanttCalendarDate(coalesceGanttDate(loc.endDate, project.endDate));
  const startStr = coalesceGanttDate(aStart, loc.startDate, project.startDate);
  const endStr = coalesceGanttDate(aEnd, loc.endDate, project.endDate);
  let s = parseGanttCalendarDate(startStr);
  let e = parseGanttCalendarDate(endStr);
  if (!winS || !winE) {
    return { start: startStr, end: endStr };
  }
  if (!s) s = winS;
  if (!e) e = winE;
  if (s < winS) s = winS;
  if (e > winE) e = winE;
  if (s > e) e = s;
  return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
}

/** Full assignment span for day blocks (not clamped to event window). */
function assignmentScheduleRange(
  aStart: string | null,
  aEnd: string | null,
  loc: GanttProjectLocation | null,
  project: GanttProject,
): { start: string | null; end: string | null; eventEnd: string | null } {
  const startStr = coalesceGanttDate(aStart, loc?.startDate ?? null, project.startDate);
  const endStr = coalesceGanttDate(aEnd, loc?.endDate ?? null, project.endDate);
  const eventEndStr = coalesceGanttDate(loc?.endDate ?? null, project.endDate);
  let s = parseGanttCalendarDate(startStr);
  let e = parseGanttCalendarDate(endStr);
  const eventEnd = parseGanttCalendarDate(eventEndStr);
  if (!s || !e) {
    return { start: startStr, end: endStr, eventEnd: eventEndStr };
  }
  if (s > e) e = s;
  return {
    start: format(s, "yyyy-MM-dd"),
    end: format(e, "yyyy-MM-dd"),
    eventEnd: eventEnd ? format(eventEnd, "yyyy-MM-dd") : eventEndStr,
  };
}

function getApprovalColor(project: GanttProject): string {
  const all = project.staffAssignments;
  if (all.length === 0) return "#EF4444";
  if (all.every(a => a.approvalStatus === "approved")) return "#22C55E";
  if (all.some(a => a.notifiedAt)) return "#F59E0B";
  return "#EF4444";
}

function inputDateVal(s: string | null): string {
  return formatGanttInputDate(s);
}

function coordInputVal(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "";
  return String(v);
}

function LocationAddressFields({
  addressLine1,
  addressLine2,
  city,
  state,
  zipCode,
  latitude,
  longitude,
  onAddressLine1Change,
  onAddressLine2Change,
  onCityChange,
  onStateChange,
  onZipCodeChange,
  onLatitudeChange,
  onLongitudeChange,
  addressFieldId = "gantt-location-address",
}: {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: string;
  longitude: string;
  onAddressLine1Change: (v: string) => void;
  onAddressLine2Change: (v: string) => void;
  onCityChange: (v: string) => void;
  onStateChange: (v: string) => void;
  onZipCodeChange: (v: string) => void;
  onLatitudeChange: (v: string) => void;
  onLongitudeChange: (v: string) => void;
  addressFieldId?: string;
}) {
  const appSettings = useAppSettingsOptional();
  const googleMapsApiKey = appSettings?.settings?.googleMapsApiKey?.trim() || undefined;
  const skipCoordClearRef = useRef(false);

  const clearCoordsIfManual = () => {
    if (!skipCoordClearRef.current) {
      onLatitudeChange("");
      onLongitudeChange("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground" htmlFor={addressFieldId}>{t("Address Line 1")}</label>
        <AddressAutocomplete
          id={addressFieldId}
          apiKey={googleMapsApiKey}
          value={addressLine1}
          onChange={(v) => {
            onAddressLine1Change(v);
            clearCoordsIfManual();
          }}
          onPlaceSelect={(addr) => {
            skipCoordClearRef.current = true;
            onAddressLine1Change(addr.street || addr.formattedAddress || addressLine1);
            if (addr.city) onCityChange(addr.city);
            if (addr.state) onStateChange(addr.state);
            if (addr.zip) onZipCodeChange(addr.zip);
            if (addr.latitude != null) onLatitudeChange(String(addr.latitude));
            if (addr.longitude != null) onLongitudeChange(String(addr.longitude));
            skipCoordClearRef.current = false;
          }}
          placeholder={t("Start typing an address…")}
          className="h-9"
          inputProps={{ autoComplete: "off" }}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">{t("Address Line 2")}</label>
        <Input
          value={addressLine2}
          onChange={(e) => {
            onAddressLine2Change(e.target.value);
            clearCoordsIfManual();
          }}
          placeholder={t("Suite, unit, building, etc.")}
          className="h-9"
        />
      </div>
      <div className="grid grid-cols-6 gap-2">
        <div className="col-span-3 space-y-1">
          <label className="text-xs text-muted-foreground">{t("City")}</label>
          <Input
            value={city}
            onChange={(e) => {
              onCityChange(e.target.value);
              clearCoordsIfManual();
            }}
            placeholder={t("City")}
            className="h-9"
          />
        </div>
        <div className="col-span-1 space-y-1">
          <label className="text-xs text-muted-foreground">{t("State")}</label>
          <Input
            value={state}
            onChange={(e) => {
              onStateChange(e.target.value);
              clearCoordsIfManual();
            }}
            placeholder="ID"
            className="h-9"
            maxLength={32}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs text-muted-foreground">{t("Zip")}</label>
          <Input
            value={zipCode}
            onChange={(e) => {
              onZipCodeChange(e.target.value);
              clearCoordsIfManual();
            }}
            placeholder="83712"
            className="h-9"
            maxLength={20}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{t("Latitude")}</label>
          <Input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => onLatitudeChange(e.target.value)}
            placeholder="43.615018"
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{t("Longitude")}</label>
          <Input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => onLongitudeChange(e.target.value)}
            placeholder="-116.202313"
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}

// ────── GanttBar component ────────────────────────────────────────────────────

function GanttBar({
  startDate, endDate, color, label, days, dayColPx, height = 20, textSize = "text-xs",
}: {
  startDate: string | null; endDate: string | null; color: string;
  label?: string; days: Date[]; dayColPx: number; height?: number; textSize?: string;
}) {
  const start = parseGanttCalendarDate(startDate);
  const end = parseGanttCalendarDate(endDate);
  if (!start || !end || days.length === 0) return null;

  const totalDays = days.length;
  const firstDay = days[0];
  const lastDay = days[totalDays - 1];

  const startDay = startOfDay(start);
  const endDay = startOfDay(end);
  const firstDayStart = startOfDay(firstDay);
  const lastDayStart = startOfDay(lastDay);

  if (endDay < firstDayStart || startDay > lastDayStart) return null;

  const clampedStart = startDay < firstDayStart ? firstDayStart : startDay;
  const clampedEnd = endDay > lastDayStart ? lastDayStart : endDay;

  const startIdx = days.findIndex(d => isSameDay(d, clampedStart));
  const endIdx = days.findIndex(d => isSameDay(d, clampedEnd));
  if (startIdx < 0) return null;

  const actualStart = Math.max(0, startIdx);
  const actualEnd = Math.min(totalDays - 1, endIdx < 0 ? totalDays - 1 : endIdx);
  const barLeftPx = actualStart * dayColPx;
  const barWidthPx = (actualEnd - actualStart + 1) * dayColPx;

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 rounded-sm overflow-hidden flex items-center px-1.5 select-none cursor-default"
      style={{ left: barLeftPx, width: barWidthPx, height, backgroundColor: color, minWidth: 4 }}
      title={`${fmtDisplay(startDate)} → ${fmtDisplay(endDate)}`}
    >
      {label && barWidthPx > dayColPx * 1.5 && (
        <span className={`text-white font-medium truncate leading-none ${textSize}`}>{label}</span>
      )}
    </div>
  );
}

function collectAllStaffAssignments(projects: GanttProject[]): GanttProjectStaff[] {
  const rows: GanttProjectStaff[] = [];
  for (const project of projects) {
    rows.push(...project.staffAssignments);
    for (const loc of project.locations) {
      rows.push(...loc.staffAssignments);
    }
  }
  return rows;
}

/** Staff rows only: discrete day squares — blank when the day is not confirmed/enabled. */
function GanttStaffScheduleBlocks({
  assignment,
  barStart,
  barEnd,
  days,
  dayColPx,
  conflictDates,
  eventEndDate,
  blockHeight = 22,
  onDayClick,
}: {
  assignment: GanttProjectStaff;
  barStart: string | null;
  barEnd: string | null;
  days: Date[];
  dayColPx: number;
  conflictDates?: Set<string>;
  eventEndDate?: string | null;
  blockHeight?: number;
  onDayClick?: (dateKey: string) => void;
}) {
  const { byDate, explicit } = useMemo(
    () => resolveStaffAssignmentSchedule(assignment.label, barStart, barEnd),
    [assignment.label, barStart, barEnd],
  );

  const mergedConflictDates = useMemo(() => {
    const set = new Set(conflictDates ?? []);
    const eventEnd = parseGanttCalendarDate(eventEndDate ?? null);
    if (!eventEnd) return set;
    const eventEndDay = startOfDay(eventEnd);
    for (const d of days) {
      const dateKey = format(d, "yyyy-MM-dd");
      const dayStart = startOfDay(d);
      const inRange =
        !!parseGanttCalendarDate(barStart) &&
        !!parseGanttCalendarDate(barEnd) &&
        dayStart >= startOfDay(parseGanttCalendarDate(barStart)!) &&
        dayStart <= startOfDay(parseGanttCalendarDate(barEnd)!);
      const confirmed = isStaffScheduleDayConfirmed(dateKey, inRange, byDate, explicit);
      if (confirmed && dayStart > eventEndDay) set.add(dateKey);
    }
    return set;
  }, [conflictDates, eventEndDate, days, barStart, barEnd, byDate, explicit]);

  const rangeStart = parseGanttCalendarDate(barStart);
  const rangeEnd = parseGanttCalendarDate(barEnd);
  const blockSize = Math.max(10, Math.min(blockHeight, dayColPx - 10));

  return (
    <div className="absolute inset-0 flex items-center pointer-events-none">
      {days.map((d, i) => {
        const dateKey = format(d, "yyyy-MM-dd");
        const dayStart = startOfDay(d);
        const inRange =
          !!rangeStart &&
          !!rangeEnd &&
          dayStart >= startOfDay(rangeStart) &&
          dayStart <= startOfDay(rangeEnd);
        const confirmed = isStaffScheduleDayConfirmed(dateKey, inRange, byDate, explicit);
        const entry = byDate.get(dateKey);
        const status = confirmed
          ? resolveStaffDayStatus(
              {
                id: assignment.id,
                approvalStatus: assignment.approvalStatus,
                notifiedAt: assignment.notifiedAt,
              },
              dateKey,
              entry,
              mergedConflictDates,
            )
          : null;
        const blockColor = status ? staffDayStatusColor(status) : undefined;

        return (
          <div
            key={i}
            className="flex shrink-0 items-center justify-center"
            style={{ width: dayColPx, minWidth: dayColPx, maxWidth: dayColPx }}
          >
            {confirmed && blockColor ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDayClick?.(dateKey);
                }}
                className={cn(
                  "rounded-[5px] shadow-sm pointer-events-auto cursor-pointer transition-shadow hover:ring-2 hover:ring-primary/60",
                  status === "begin" ? "ring-1 ring-gray-300" : "ring-1 ring-black/5",
                )}
                style={{
                  width: blockSize,
                  height: blockSize,
                  backgroundColor: blockColor,
                }}
                title={
                  entry
                    ? `${fmtDisplay(dateKey)} · ${entry.startTime} – ${entry.endTime} · ${staffDayStatusLabel(status!)}`
                    : `${fmtDisplay(dateKey)} · ${staffDayStatusLabel(status!)}`
                }
                aria-label={`${fmtDisplay(dateKey)} · ${staffDayStatusLabel(status!)}`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Jump-to-month control when staff days fall outside the visible month. */
function GanttStaffScheduleOffscreenHint({
  barStart,
  barEnd,
  days,
  onNavigate,
}: {
  barStart: string | null;
  barEnd: string | null;
  days: Date[];
  onNavigate: (month: Date) => void;
}) {
  const start = parseGanttCalendarDate(barStart);
  const end = parseGanttCalendarDate(barEnd);
  if (!start || !end || days.length === 0) return null;

  const viewStart = startOfDay(days[0]);
  const viewEnd = startOfDay(days[days.length - 1]);
  const rangeStart = startOfDay(start);
  const rangeEnd = startOfDay(end);

  if (rangeEnd >= viewStart && rangeStart <= viewEnd) return null;

  const future = rangeStart > viewEnd;
  const targetMonth = startOfMonth(future ? rangeStart : rangeEnd);

  return (
    <button
      type="button"
      className={cn(
        "pointer-events-auto absolute top-1/2 z-[3] -translate-y-1/2 rounded-md border border-border/80 bg-background/95 px-2 py-1 text-[11px] font-medium text-primary shadow-sm hover:bg-muted/60",
        future ? "right-2" : "left-2",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onNavigate(targetMonth);
      }}
      title={t("Jump to assignment dates")}
    >
      {future ? "→" : "←"} {fmtShort(barStart)} – {fmtShort(barEnd)}
    </button>
  );
}

function StaffScheduleLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-1.5 text-[11px] text-muted-foreground border-b border-border/60 bg-muted/20">
      <span className="font-medium text-foreground/80">{t("Staff day status")}:</span>
      {GANTT_STAFF_DAY_STATUS_ORDER.map((status) => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-[3px]",
              status === "begin" ? "ring-1 ring-gray-300" : "ring-1 ring-black/10",
            )}
            style={{ backgroundColor: staffDayStatusColor(status) }}
          />
          {t(staffDayStatusLabel(status))}
        </span>
      ))}
    </div>
  );
}

function GanttDayGrid({
  days,
  dayColPx,
  todayIdx,
  className = "",
}: {
  days: Date[];
  dayColPx: number;
  todayIdx: number;
  className?: string;
}) {
  return (
    <div className={`pointer-events-none absolute inset-0 flex ${className}`}>
      {days.map((d, i) => {
        const isWknd = d.getDay() === 0 || d.getDay() === 6;
        const isTodayDay = i === todayIdx;
        return (
          <div
            key={i}
            className={[
              "shrink-0 border-r border-border/40",
              isWknd ? "bg-muted/25" : "",
              isTodayDay ? "bg-primary/10" : "",
            ].join(" ")}
            style={{ width: dayColPx, minWidth: dayColPx, maxWidth: dayColPx }}
          />
        );
      })}
    </div>
  );
}

// ────── Edit panels (slide-in drawer) ────────────────────────────────────────

function EditProjectPanel({
  project, clientsList, onUpdate, onDelete, onClose, onEditLocation,
}: {
  project: GanttProject; clientsList: Array<{ id: string; name: string; code?: string; contactPerson?: string }>;
  onUpdate: (data: Partial<GanttProject>) => void;
  onDelete: () => void; onClose: () => void;
  onEditLocation: (loc: GanttProjectLocation) => void;
}) {
  const [clientId, setClientId] = useState(project.clientId ?? "__none__");
  const [name, setName] = useState(project.name);
  const [selectedProjectId, setSelectedProjectId] = useState("__none__");
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [color, setColor] = useState(project.color ?? "#3B82F6");
  const [startDate, setStartDate] = useState(inputDateVal(project.startDate));
  const [endDate, setEndDate] = useState(inputDateVal(project.endDate));

  useEffect(() => {
    fetch("/api/project/list?per_page=100", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data) {
          setProjectOptions(d.data);
          if (project.projectRefId) {
            setSelectedProjectId(String(project.projectRefId));
          } else {
            const match = d.data.find((p: ProjectOption) => p.name === project.name);
            if (match) setSelectedProjectId(String(match.id));
          }
        }
      })
      .catch(() => {});
  }, [project.name, project.projectRefId]);

  const handleProjectSelect = (val: string) => {
    setSelectedProjectId(val);
    if (val !== "__none__") {
      const proj = projectOptions.find(p => String(p.id) === val);
      if (proj) {
        setName(proj.name);
        if (proj.start_date) setStartDate(proj.start_date);
        if (proj.end_date) setEndDate(proj.end_date);
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{t("Edit Project")}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
        <span className="font-medium text-sm">{project.name}</span>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">{t("Client")}</label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="h-9"><SelectValue placeholder="No Client" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{t("No Client")}</SelectItem>
            {clientsList.map(c => (
              <SelectItem key={c.id} value={c.id}>
                <span>{c.name}</span>
                {c.code && <span className="text-muted-foreground text-xs ml-1">({c.code})</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">{t("Project Name")}</label>
        <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder={t("Select a project...")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{t("Select a project...")}</SelectItem>
            {projectOptions.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">{t("Color")}</label>
        <div className="relative w-full h-8 rounded overflow-hidden cursor-pointer" style={{ backgroundColor: color }}>
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><Calendar className="h-3.5 w-3.5" />{t("Date Range")}</div>
        <div className="flex gap-2">
          <div className="flex-1 space-y-0.5">
            <label className="text-xs text-muted-foreground">{t("Start")}</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="flex-1 space-y-0.5">
            <label className="text-xs text-muted-foreground">{t("End")}</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-xs" />
          </div>
        </div>
      </div>
      <Button className="w-full" onClick={() => onUpdate({
        name, color, clientId: clientId === "__none__" ? null : clientId,
        projectRefId: selectedProjectId !== "__none__" ? Number(selectedProjectId) : null,
        startDate: startDate || project.startDate, endDate: endDate || project.endDate,
      })}>{t("Save Changes")}</Button>
      {project.locations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t("Locations")} ({project.locations.length})</p>
          {project.locations.map(loc => (
            <div key={loc.id} className="flex items-center justify-between py-1 border-b">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: loc.color ?? "#6366F1" }} />
                <span className="text-sm">{loc.name}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{loc.staffAssignments.length + loc.subAssignments.length} {t("assigned")}</span>
                <button onClick={() => onEditLocation(loc)} className="text-muted-foreground hover:text-foreground ml-1">
                  <Settings className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={onDelete} className="text-xs text-destructive hover:underline text-left mt-auto">{t("Delete Project")}</button>
    </div>
  );
}

function EditLocationPanel({
  location, project, onUpdate, onDelete, onClose,
}: {
  location: GanttProjectLocation; project: GanttProject;
  onUpdate: (data: Partial<GanttProjectLocation>) => void;
  onDelete: () => void; onClose: () => void;
}) {
  const [name, setName] = useState(location.name);
  const [color, setColor] = useState(location.color ?? "#6366F1");
  const [addressLine1, setAddressLine1] = useState(location.addressLine1 ?? "");
  const [addressLine2, setAddressLine2] = useState(location.addressLine2 ?? "");
  const [city, setCity] = useState(location.city ?? "");
  const [state, setState] = useState(location.state ?? "");
  const [zipCode, setZipCode] = useState(location.zipCode ?? "");
  const [latitude, setLatitude] = useState(coordInputVal(location.latitude));
  const [longitude, setLongitude] = useState(coordInputVal(location.longitude));
  const [startDate, setStartDate] = useState(inputDateVal(location.startDate));
  const [endDate, setEndDate] = useState(inputDateVal(location.endDate));
  const [showLocationMap, setShowLocationMap] = useState(location.showLocationMap ?? false);

  const mapQuery = buildGanttLocationMapQuery(latitude, longitude, {
    addressLine1,
    addressLine2,
    city,
    state,
    zipCode,
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{t("Edit Location")}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-medium text-sm">{location.name}</span>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">{t("Part of:")} {project.name}</p>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">{t("Location Name")}</label>
        <Input value={name} onChange={e => setName(e.target.value)} className="h-9" />
      </div>
      <LocationAddressFields
        addressLine1={addressLine1}
        addressLine2={addressLine2}
        city={city}
        state={state}
        zipCode={zipCode}
        latitude={latitude}
        longitude={longitude}
        onAddressLine1Change={setAddressLine1}
        onAddressLine2Change={setAddressLine2}
        onCityChange={setCity}
        onStateChange={setState}
        onZipCodeChange={setZipCode}
        onLatitudeChange={setLatitude}
        onLongitudeChange={setLongitude}
        addressFieldId="gantt-edit-location-address"
      />
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">{t("Color")}</label>
        <div className="relative w-full h-8 rounded overflow-hidden cursor-pointer" style={{ backgroundColor: color }}>
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Calendar className="h-3.5 w-3.5" />{t("Date Range")}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("Project dates:")} {fmtDisplay(project.startDate)} - {fmtDisplay(project.endDate)}
        </p>
        <div className="flex gap-2">
          <div className="flex-1 space-y-0.5">
            <label className="text-xs text-muted-foreground">{t("Start")}</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              min={inputDateVal(project.startDate)} max={inputDateVal(project.endDate)} className="h-9 text-xs" />
          </div>
          <div className="flex-1 space-y-0.5">
            <label className="text-xs text-muted-foreground">{t("End")}</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              min={inputDateVal(project.startDate)} max={inputDateVal(project.endDate)} className="h-9 text-xs" />
          </div>
        </div>
      </div>
      <Button className="w-full" onClick={() => {
        const latN = parseGanttCoordinate(latitude);
        const lngN = normalizeGanttLongitudeForUsState(state, longitude);
        onUpdate({
        name,
        color,
        addressLine1: addressLine1.trim() || null,
        addressLine2: addressLine2.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        zipCode: zipCode.trim() || null,
        latitude: latN != null ? String(latN) : null,
        longitude: lngN != null ? String(lngN) : null,
        startDate: startDate || null,
        endDate: endDate || null,
        showLocationMap,
      });
      }}>
        {t("Save Changes")}
      </Button>
      {(location.staffAssignments.length > 0 || location.subAssignments.length > 0) && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {t("Staff Assignments")} ({location.staffAssignments.length + location.subAssignments.length})
          </p>
          {location.staffAssignments.map(a => (
            <div key={a.id} className="flex items-center justify-between py-1 border-b text-sm">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span>{a.staff?.name ?? t("Unassigned")}</span>
              </div>
              <span className="text-xs text-muted-foreground">{fmtShort(a.startDate)} - {fmtShort(a.endDate)}</span>
            </div>
          ))}
          {location.subAssignments.map(a => (
            <div key={a.id} className="flex items-center justify-between py-1 border-b text-sm">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <span>{a.sub?.name ?? t("Unassigned")}</span>
              </div>
              <span className="text-xs text-muted-foreground">{fmtShort(a.startDate)} - {fmtShort(a.endDate)}</span>
            </div>
          ))}
        </div>
      )}
      <LocationMapToggle
        enabled={showLocationMap}
        onEnabledChange={setShowLocationMap}
        mapQuery={mapQuery}
      />
      <button onClick={onDelete} className="text-xs text-destructive hover:underline text-left mt-auto">{t("Delete Location")}</button>
    </div>
  );
}

// ────── Create Project Modal ──────────────────────────────────────────────────

type ProjectOption = { id: number; name: string; start_date: string | null; end_date: string | null };

function CreateProjectModal({
  open, onClose, onCreated, clientsList,
}: {
  open: boolean; onClose: () => void;
  onCreated: () => void;
  clientsList: Array<{ id: string; name: string; code?: string; contactPerson?: string }>;
}) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const thirtyDaysStr = format(new Date(Date.now() + 30 * 86400000), "yyyy-MM-dd");
  const [clientId, setClientId] = useState("__none__");
  const [name, setName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("__none__");
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(thirtyDaysStr);
  const [color, setColor] = useState("#3B82F6");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/project/list?per_page=100", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data) setProjectOptions(d.data);
      })
      .catch(() => {});
  }, [open]);

  const handleProjectSelect = (val: string) => {
    setSelectedProjectId(val);
    if (val === "__none__") {
      setName("");
      setStartDate(todayStr);
      setEndDate(thirtyDaysStr);
    } else {
      const proj = projectOptions.find(p => String(p.id) === val);
      if (proj) {
        setName(proj.name);
        if (proj.start_date) setStartDate(proj.start_date);
        if (proj.end_date) setEndDate(proj.end_date);
      }
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(t("Project name is required"));
      return;
    }
    const sd = startDate || todayStr;
    const ed = endDate || thirtyDaysStr;
    setLoading(true);
    try {
      const res = await fetch("/api/gantt-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), startDate: sd, endDate: ed, color, clientId: clientId === "__none__" ? null : clientId, projectRefId: selectedProjectId !== "__none__" ? selectedProjectId : null }),
      });
      if (res.ok) {
        toast.success(t("Project created successfully"));
        onCreated();
        onClose();
        setName(""); setSelectedProjectId("__none__"); setStartDate(todayStr); setEndDate(thirtyDaysStr); setColor("#3B82F6"); setClientId("__none__");
      } else {
        const err = await res.json();
        toast.error(err.error ?? t("Failed to create project"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] overflow-y-auto flex flex-col gap-0 p-0 [&>button.absolute]:hidden"
      >
        <SheetHeader className="px-6 py-4 border-b text-left space-y-1">
          <SheetTitle>{t("Create New Project")}</SheetTitle>
          <SheetDescription className="sr-only">{t("Create a new Gantt project")}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-6 py-5 flex-1">
          <div className="space-y-1">
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("No Client")}</SelectItem>
                {clientsList.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <span>{c.name}</span>
                    {c.code && <span className="text-muted-foreground text-xs ml-1">({c.code})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
              <SelectTrigger>
                <SelectValue placeholder={`${t("Project Name")} *`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("Select a project...")}</SelectItem>
                {projectOptions.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <label htmlFor="gantt-start-date" className="text-xs text-muted-foreground">{t("Start Date")}</label>
              <Input id="gantt-start-date" type="date" value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-10 focus-visible:outline-none focus:border-primary" />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label htmlFor="gantt-end-date" className="text-xs text-muted-foreground">{t("End Date")}</label>
              <Input id="gantt-end-date" type="date" value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-10 focus-visible:outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{t("Color:")}</span>
            <div className="relative h-8 w-16 rounded overflow-hidden cursor-pointer" style={{ backgroundColor: color }}>
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
          </div>
        </div>
        <div className="border-t px-6 py-4 flex justify-end gap-2 bg-background mt-auto">
          <Button variant="outline" onClick={onClose}>{t("Cancel")}</Button>
          <Button id="gantt-create-btn" onClick={handleCreate} disabled={loading}>{loading ? t("Creating...") : t("Create")}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ────── Add Location Modal ────────────────────────────────────────────────────

type LocationAddressForm = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: string;
  longitude: string;
};

const EMPTY_LOCATION_ADDRESS: LocationAddressForm = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  latitude: "",
  longitude: "",
};

function formatLocationAddressSummary(addr: LocationAddressForm): string {
  const line = [addr.city, addr.state, addr.zipCode].filter(Boolean).join(", ");
  return [addr.addressLine1, addr.addressLine2, line].filter(Boolean).join("\n");
}

function LocationMapToggle({
  enabled,
  onEnabledChange,
  mapQuery,
}: {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  mapQuery: string | null;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
        <div>
          <p className="text-xs font-medium text-foreground">{t("Location map")}</p>
          <p className="text-[10px] text-muted-foreground">{enabled ? t("On") : t("Off")}</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onEnabledChange}
          aria-label={t("Toggle location map")}
        />
      </div>
      {enabled && mapQuery ? (
        <div className="aspect-[16/9] overflow-hidden rounded-lg border border-border/60 bg-muted">
          <iframe
            title={t("Location map")}
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
          />
        </div>
      ) : null}
      {enabled && !mapQuery ? (
        <p className="text-xs text-muted-foreground">{t("Add an address or coordinates to show the map.")}</p>
      ) : null}
    </div>
  );
}

function AddLocationModal({
  projectId,
  projectName,
  projectRefId,
  projectStartDate,
  projectEndDate,
  onClose,
  onCreated,
}: {
  projectId: string;
  projectName: string;
  projectRefId: number | null;
  projectStartDate: string;
  projectEndDate: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [projectAddress, setProjectAddress] = useState<LocationAddressForm>(EMPTY_LOCATION_ADDRESS);
  const [projectAddressLoading, setProjectAddressLoading] = useState(Boolean(projectRefId));
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [startDate, setStartDate] = useState(inputDateVal(projectStartDate));
  const [endDate, setEndDate] = useState(inputDateVal(projectEndDate));
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectRefId) {
      setProjectAddressLoading(false);
      return;
    }

    let cancelled = false;
    setProjectAddressLoading(true);
    fetch(`/api/project/${projectRefId}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setProjectAddress({
          addressLine1: String(data.address ?? ""),
          addressLine2: String(data.address_2 ?? ""),
          city: String(data.city ?? ""),
          state: String(data.state ?? ""),
          zipCode: String(data.zip_code ?? ""),
          latitude: "",
          longitude: "",
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setProjectAddressLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectRefId]);

  const activeAddress = useNewAddress ? {
    addressLine1,
    addressLine2,
    city,
    state,
    zipCode,
    latitude,
    longitude,
  } : projectAddress;

  const mapQuery = buildGanttLocationMapQuery(activeAddress.latitude, activeAddress.longitude, activeAddress);

  const projectAddressSummary = formatLocationAddressSummary(projectAddress);
  const hasProjectAddress = Boolean(projectAddressSummary.trim());

  const handleCreate = async () => {
    if (!name.trim()) return;
    if (startDate && endDate && startDate > endDate) {
      toast.error(t("End date must be on or after start date"));
      return;
    }
    if (!useNewAddress && !hasProjectAddress) {
      toast.error(t("This project has no address on file. Switch to add a new address."));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/gantt-project-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name: name.trim(),
          addressLine1: activeAddress.addressLine1.trim() || null,
          addressLine2: activeAddress.addressLine2.trim() || null,
          city: activeAddress.city.trim() || null,
          state: activeAddress.state.trim() || null,
          zipCode: activeAddress.zipCode.trim() || null,
          latitude: activeAddress.latitude.trim() || null,
          longitude: activeAddress.longitude.trim() || null,
          startDate: startDate || null,
          endDate: endDate || null,
          showLocationMap,
        }),
      });
      if (res.ok) { toast.success(t("Location added")); onCreated(); onClose(); }
      else { const err = await res.json(); toast.error(err.error ?? t("Failed")); }
    } finally { setLoading(false); }
  };

  return (
    <ProjectDrawer
      open
      onOpenChange={(v) => !v && onClose()}
      title={t("Add Location")}
      description={t("Add a location to this project")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{t("Cancel")}</Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !name.trim() || (!useNewAddress && projectAddressLoading)}
          >
            {t("Add")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Project")}</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{projectName}</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{t("Location Name")}</label>
          <Input
            placeholder={t("Location name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
            <span className={cn("text-xs font-medium", !useNewAddress ? "text-foreground" : "text-muted-foreground")}>
              {t("Same address as project")}
            </span>
            <Switch
              checked={useNewAddress}
              onCheckedChange={setUseNewAddress}
              aria-label={t("Use a new address instead of the project address")}
            />
            <span className={cn("text-xs font-medium text-right", useNewAddress ? "text-foreground" : "text-muted-foreground")}>
              {t("Add new address")}
            </span>
          </div>
          {!useNewAddress ? (
            <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 text-sm text-foreground">
              {projectAddressLoading ? (
                <p className="text-xs text-muted-foreground">{t("Loading project address…")}</p>
              ) : hasProjectAddress ? (
                <div className="flex gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="whitespace-pre-line text-xs leading-relaxed">{projectAddressSummary}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("No project address on file. Slide right to add a new address.")}
                </p>
              )}
            </div>
          ) : (
            <LocationAddressFields
              addressLine1={addressLine1}
              addressLine2={addressLine2}
              city={city}
              state={state}
              zipCode={zipCode}
              latitude={latitude}
              longitude={longitude}
              onAddressLine1Change={setAddressLine1}
              onAddressLine2Change={setAddressLine2}
              onCityChange={setCity}
              onStateChange={setState}
              onZipCodeChange={setZipCode}
              onLatitudeChange={setLatitude}
              onLongitudeChange={setLongitude}
              addressFieldId="gantt-add-location-address"
            />
          )}
        </div>
        <LocationMapToggle
          enabled={showLocationMap}
          onEnabledChange={setShowLocationMap}
          mapQuery={mapQuery}
        />
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Calendar className="h-3.5 w-3.5" />{t("Date Range")}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("Project dates:")} {fmtDisplay(projectStartDate)} - {fmtDisplay(projectEndDate)}
          </p>
          <div className="flex gap-2">
            <div className="flex-1 space-y-0.5">
              <label className="text-xs text-muted-foreground">{t("Start Date")}</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={inputDateVal(projectStartDate)}
                max={inputDateVal(projectEndDate)}
                className="h-9 text-xs"
              />
            </div>
            <div className="flex-1 space-y-0.5">
              <label className="text-xs text-muted-foreground">{t("End Date")}</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={inputDateVal(projectStartDate)}
                max={inputDateVal(projectEndDate)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </ProjectDrawer>
  );
}

// ────── Add Staff / Sub Modal ─────────────────────────────────────────────────

function AddMemberModal({
  type,
  projectId,
  locationId,
  defaultStartDate,
  defaultEndDate,
  list,
  existingStaffAssignments = [],
  onClose,
  onCreated,
}: {
  type: "staff" | "sub";
  projectId: string;
  locationId: string | null;
  defaultStartDate: string | null;
  defaultEndDate: string | null;
  list: GanttStaff[] | GanttSub[];
  existingStaffAssignments?: GanttProjectStaff[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [selectedId, setSelectedId] = useState("__none__");
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifyStaff, setNotifyStaff] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [daySchedule, setDaySchedule] = useState<GanttDayScheduleEntry[]>([]);

  const staffSelected = selectedId !== "__none__";

  const datesReady = useMemo(() => {
    if (!startDate || !endDate) return false;
    const s = parseGanttCalendarDate(startDate);
    const e = parseGanttCalendarDate(endDate);
    return Boolean(s && e && s <= e);
  }, [startDate, endDate]);

  useEffect(() => {
    if (!datesReady) {
      setDaySchedule([]);
      return;
    }
    setDaySchedule((prev) => buildDaySchedule(startDate, endDate, prev));
  }, [startDate, endDate, datesReady]);

  const selectMember = (memberId: string) => {
    setSelectedId(memberId);
    setDropdownOpen(false);
    setSearch("");
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(m => m.name.toLowerCase().includes(q));
  }, [list, search]);

  const selectedMember = list.find(m => m.id === selectedId);

  const staffAssignment = useMemo(() => {
    if (type !== "staff" || !staffSelected) return null;
    return {
      id: "new",
      approvalStatus: "pending",
      notifiedAt: notifyStaff ? "preview" : null,
    };
  }, [type, staffSelected, notifyStaff]);

  const addConflictDates = useMemo(() => {
    if (type !== "staff" || !staffSelected) return undefined;
    const enabledDates = daySchedule.filter((d) => d.enabled).map((d) => d.date);
    return buildStaffScheduleConflictDates(selectedId, enabledDates, existingStaffAssignments);
  }, [type, staffSelected, selectedId, daySchedule, existingStaffAssignments]);

  const handleAdd = async () => {
    if (selectedId === "__none__") {
      toast.error(t("Please select a member"));
      return;
    }
    if (!startDate || !endDate) {
      toast.error(t("Please set a start and end date"));
      return;
    }
    if (daySchedule.filter((d) => d.enabled).length === 0) {
      toast.error(t("Select at least one working day"));
      return;
    }
    setLoading(true);
    const endpoint = type === "staff" ? "/api/gantt-project-staff" : "/api/gantt-project-subs";
    const key = type === "staff" ? "staffId" : "subId";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          locationId,
          [key]: selectedId,
          startDate,
          endDate,
          daySchedule,
          ...(type === "staff" ? { notifyStaff } : {}),
        }),
      });
      if (res.ok) {
        const payload = await res.json().catch(() => null) as {
          notification?: { emailSent?: boolean; smsSent?: boolean; reason?: string };
        } | null;
        toast.success(type === "staff" ? t("Staff assigned") : t("Sub-contractor assigned"));
        if (type === "staff" && payload?.notification) {
          const { emailSent, smsSent, reason } = payload.notification;
          if (emailSent && smsSent) toast.info(t("Staff notified by email and text message"));
          else if (emailSent) toast.info(t("Staff notified by email"));
          else if (smsSent) toast.info(t("Staff notified by text message"));
          else if (notifyStaff) {
            toast.warning(
              reason === "no_contact"
                ? t("Assignment saved but staff has no email or phone on file.")
                : t("Assignment saved but notification could not be sent. Check email settings."),
            );
          }
        }
        onCreated();
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.error ?? t("Failed"));
      }
    } finally { setLoading(false); }
  };

  return (
    <ProjectDrawer
      open
      onOpenChange={(v) => !v && onClose()}
      scrollable
      title={type === "staff" ? t("Add Staff Assignment") : t("Add Sub-contractor")}
      description={
        type === "staff"
          ? t("Select a staff member and set their working schedule for this location.")
          : t("Select a sub-contractor and set their working schedule for this location.")
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{t("Cancel")}</Button>
          <Button
            onClick={handleAdd}
            disabled={
              loading ||
              selectedId === "__none__" ||
              !datesReady ||
              daySchedule.filter((d) => d.enabled).length === 0
            }
          >
            {loading ? t("Assigning...") : t("Assign")}
          </Button>
        </>
      }
    >
        <div className="space-y-4">
          {type === "staff" ? (
            <div className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2">
              <Checkbox
                id="notify-staff-add"
                checked={notifyStaff}
                onCheckedChange={(checked) => setNotifyStaff(checked === true)}
              />
              <label htmlFor="notify-staff-add" className="cursor-pointer text-xs text-muted-foreground">
                {t("Notify staff by email or text when saving")}
              </label>
            </div>
          ) : null}

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              {type === "staff" ? t("Staff Member") : t("Subcontractor")}
            </label>
          <div className="relative">
            <button
              type="button"
              className="w-full flex items-center justify-between border border-input rounded-md px-3 h-10 text-sm bg-background hover:bg-accent/20 focus:outline-none focus:ring-1 focus:ring-primary"
              onClick={() => setDropdownOpen(v => !v)}
            >
              <span className={selectedMember ? "text-foreground" : "text-muted-foreground"}>
                {selectedMember ? selectedMember.name : t("Select...")}
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute z-50 w-full top-full mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                {/* Search input */}
                <div className="p-2 border-b border-border">
                  <input
                    autoFocus
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={type === "staff" ? t("Search staff...") : t("Search sub-contractors...")}
                    className="w-full text-sm px-2 py-1 bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                </div>
                {/* Staff list */}
                <div className="max-h-48 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      {list.length === 0
                        ? t("No staff found. Active HRM employees are synced automatically — refresh or check HRM → Employees.")
                        : t("No results found")}
                    </div>
                  ) : (
                    filtered.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2
                          ${selectedId === m.id ? "bg-accent/50 font-medium" : ""}`}
                        onClick={() => selectMember(m.id)}
                      >
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: m.color ?? "#3B82F6" }} />
                        {m.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          </div>

          <GanttWorkingDaysFields
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            daySchedule={daySchedule}
            onDayScheduleChange={setDaySchedule}
            barColor={selectedMember?.color ?? "#3B82F6"}
            minDate={defaultStartDate}
            maxDate={defaultEndDate}
            showWorkingPeriod={staffSelected}
            showWorkingDaysList={staffSelected && datesReady}
            staffAssignment={staffAssignment}
            conflictDates={addConflictDates}
          />
        </div>
    </ProjectDrawer>
  );
}

// ────── Main component ────────────────────────────────────────────────────────

export type ProjectGanttHandle = {
  openCreateProject: () => void;
};

/** Controlled filter state when the parent renders the list-style toolbar (Manage Project). */
export type ProjectGanttFilters = {
  search: string;
  onSearchChange: (v: string) => void;
  clientFilter: string;
  onClientFilterChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  dateRangeFilter: string;
  onDateRangeFilterChange: (v: string) => void;
};

export type ProjectGanttProps = {
  /** When true (embedded in Manage Project), the duplicate "Add Project" button is hidden; use ref + parent "Create Project" instead. */
  embedded?: boolean;
  /** When set, filter UI is omitted and these values drive the chart (same filters as the standalone toolbar had). */
  filters?: ProjectGanttFilters;
};

const ProjectGantt = forwardRef<ProjectGanttHandle, ProjectGanttProps>(function ProjectGantt(
  { embedded = false, filters: filtersProp },
  ref,
) {
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(today);
  const [projects, setProjects] = useState<GanttProject[]>([]);
  const [staffList, setStaffList] = useState<GanttStaff[]>([]);
  const [subsList, setSubsList] = useState<GanttSub[]>([]);
  const [clientsList, setClientsList] = useState<Array<{ id: string; name: string; code?: string; contactPerson?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [hourEntries, setHourEntries] = useState<Array<{
    assignmentId: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
  }>>([]);

  const clockMap = useMemo(() => buildGanttClockMap(hourEntries), [hourEntries]);
  const staffConflictDates = useMemo(
    () => buildGanttStaffConflictDateMap(collectAllStaffAssignments(projects)),
    [projects],
  );

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [addLocationFor, setAddLocationFor] = useState<{
    projectId: string;
    projectName: string;
    projectRefId: number | null;
    startDate: string;
    endDate: string;
  } | null>(null);
  const [addMemberFor, setAddMemberFor] = useState<{
    type: "staff" | "sub";
    projectId: string;
    locationId: string | null;
    defaultStartDate: string | null;
    defaultEndDate: string | null;
  } | null>(null);

  const [detailDrawer, setDetailDrawer] = useState<DetailDrawer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const [localSearch, setLocalSearch] = useState("");
  const [localClientFilter, setLocalClientFilter] = useState("__all__");
  const [localStatusFilter, setLocalStatusFilter] = useState("__all__");
  const [localDateRangeFilter, setLocalDateRangeFilter] = useState("__all__");

  const searchFilter = filtersProp?.search ?? localSearch;
  const clientFilter = filtersProp?.clientFilter ?? localClientFilter;
  const statusFilter = filtersProp?.statusFilter ?? localStatusFilter;
  const dateRangeFilter = filtersProp?.dateRangeFilter ?? localDateRangeFilter;

  const timelineRef = useRef<HTMLDivElement>(null);
  const hasAutoNavigatedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    openCreateProject: () => setShowCreateProject(true),
  }));

  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }), [currentMonth]);

  /** Fixed day column width — bars and headers share this exact pixel width. */
  const GANTT_DAY_COL_PX = 36;
  const ganttSidebarPx = 240;
  const GANTT_RIGHT_NAV_PX = 96;
  const timelineWidthPx = days.length * GANTT_DAY_COL_PX;
  const ganttGridMinWidth = ganttSidebarPx + timelineWidthPx + GANTT_RIGHT_NAV_PX;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, stRes, suRes, clRes, heRes] = await Promise.all([
        fetch("/api/gantt-projects", { credentials: "include", cache: "no-store" }),
        fetch("/api/gantt-staff", { credentials: "include", cache: "no-store" }),
        fetch("/api/gantt-subs", { credentials: "include", cache: "no-store" }),
        fetch("/api/gantt-clients", { credentials: "include", cache: "no-store" }),
        fetch("/api/gantt-hour-entries?companyScope=1", { credentials: "include", cache: "no-store" }),
      ]);
      if (pRes.ok) {
        const data = await pRes.json();
        setProjects(Array.isArray(data) ? data : []);
      } else {
        const err = await pRes.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? t("Failed to load Gantt projects"));
      }
      if (stRes.ok) {
        const staff = await stRes.json();
        setStaffList(Array.isArray(staff) ? dedupeGanttStaffList(staff) : []);
      }
      if (suRes.ok) setSubsList(await suRes.json());
      if (clRes.ok) setClientsList(await clRes.json());
      if (heRes.ok) {
        const rows = await heRes.json();
        setHourEntries(
          Array.isArray(rows)
            ? rows.map((r: { assignmentId: string; date: string; startTime?: string | null; endTime?: string | null }) => ({
                assignmentId: r.assignmentId,
                date: String(r.date).slice(0, 10),
                startTime: r.startTime ?? null,
                endTime: r.endTime ?? null,
              }))
            : [],
        );
      }
    } catch { toast.error(t("Failed to load data")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Re-sync project staff from HRM when opening the assign-staff modal
  useEffect(() => {
    if (!addMemberFor || addMemberFor.type !== "staff") return;
    fetch("/api/gantt-staff")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setStaffList(dedupeGanttStaffList(data));
      })
      .catch(() => {});
  }, [addMemberFor]);

  // After projects load, navigate to the month of the earliest project start date
  useEffect(() => {
    if (loading || projects.length === 0 || hasAutoNavigatedRef.current) return;
    hasAutoNavigatedRef.current = true;

    const startDates = projects
      .map(p => p.startDate)
      .filter(Boolean)
      .map(s => parseGanttCalendarDate(s))
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

    if (startDates.length === 0) return;

    const earliest = startDates.reduce((a, b) => a < b ? a : b);
    const earliestMonth = startOfMonth(earliest);
    const todayMonth = startOfMonth(today);

    // Navigate to earliest project month if it's before today's month
    if (earliestMonth < todayMonth) {
      setCurrentMonth(earliestMonth);
    }
  }, [loading, projects, today]);

  // Scroll to show the earliest project start date (or today if already in current month)
  useEffect(() => {
    if (loading || !timelineRef.current || days.length === 0) return;

    const startDates = projects
      .map(p => p.startDate)
      .filter(Boolean)
      .map(s => parseGanttCalendarDate(s))
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

    let targetIdx = -1;

    if (startDates.length > 0) {
      const earliest = startDates.reduce((a, b) => a < b ? a : b);
      targetIdx = days.findIndex(d => isSameDay(d, startOfDay(earliest)));
    }

    if (targetIdx < 0) {
      targetIdx = days.findIndex(d => isToday(d));
    }

    if (targetIdx >= 0) {
      const pct = targetIdx / days.length;
      const scrollTarget = pct * timelineRef.current.scrollWidth - timelineRef.current.clientWidth / 4;
      timelineRef.current.scrollLeft = Math.max(0, scrollTarget);
    }
  }, [loading, days, projects]);

  const navigateMonth = (dir: number) => {
    setCurrentMonth(prev => {
      const d = new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
      return d;
    });
  };

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q));
    }
    if (clientFilter !== "__all__") result = result.filter(p => p.clientId === clientFilter);
    if (statusFilter !== "__all__") result = result.filter(p => p.status === statusFilter);
    if (dateRangeFilter !== "__all__") {
      const now = startOfDay(today);
      let cutoff: Date | null = null;
      if (dateRangeFilter === "today") cutoff = now;
      else if (dateRangeFilter === "last30") cutoff = subDays(now, 30);
      else if (dateRangeFilter === "thisMonth") cutoff = startOfMonth(now);
      else if (dateRangeFilter === "lastMonth") cutoff = startOfMonth(subMonths(now, 1));
      else if (dateRangeFilter === "last90") cutoff = subDays(now, 90);
      else if (dateRangeFilter === "last6m") cutoff = subMonths(now, 6);
      else if (dateRangeFilter === "last1y") cutoff = subMonths(now, 12);
      if (cutoff) result = result.filter(p => new Date(p.createdAt) >= cutoff!);
    }
    return result;
  }, [projects, searchFilter, clientFilter, statusFilter, dateRangeFilter, today]);

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      const opening = !next.has(id);
      if (opening) {
        next.add(id);
        const project = projects.find((p) => p.id === id);
        const projectStart = parseGanttCalendarDate(coalesceGanttDate(project?.startDate ?? null));
        if (projectStart) {
          setCurrentMonth(startOfMonth(projectStart));
        }
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleLocation = (id: string) => setExpandedLocations(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const todayIdx = days.findIndex(d => isToday(d));

  // ── CRUD handlers ────────────────────────────────────────────────────────────

  const handleUpdateProject = async (id: string, data: Partial<GanttProject>) => {
    const res = await fetch(`/api/gantt-projects/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (res.ok) { toast.success(t("Project updated")); setDetailDrawer(null); fetchAll(); }
    else toast.error(t("Failed to update project"));
  };

  const handleDeleteProject = async (id: string) => {
    const res = await fetch(`/api/gantt-projects/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success(t("Project deleted")); setDetailDrawer(null); fetchAll(); }
    else toast.error(t("Failed to delete project"));
  };

  const handleUpdateLocation = async (id: string, data: Partial<GanttProjectLocation>) => {
    const res = await fetch(`/api/gantt-project-locations/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (res.ok) { toast.success(t("Location updated")); setDetailDrawer(null); fetchAll(); }
    else toast.error(t("Failed to update location"));
  };

  const handleDeleteLocation = async (id: string) => {
    const res = await fetch(`/api/gantt-project-locations/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success(t("Location deleted")); setDetailDrawer(null); fetchAll(); }
    else toast.error(t("Failed to delete location"));
  };

  const handleUpdateAssignment = async (type: "staff" | "sub", id: string, data: Record<string, unknown>) => {
    const ep = type === "staff" ? `/api/gantt-project-staff/${id}` : `/api/gantt-project-subs/${id}`;
    const res = await fetch(ep, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) {
      const payload = await res.json().catch(() => null) as {
        notification?: { emailSent?: boolean; smsSent?: boolean; reason?: string };
        eventDatesExtended?: boolean;
      } | null;
      toast.success(t("Assignment updated"));
      if (payload?.eventDatesExtended) {
        toast.info(t("Event dates extended on the calendar"));
      }
      if (payload?.notification) {
        const { emailSent, smsSent, reason } = payload.notification;
        if (emailSent && smsSent) toast.info(t("Staff notified by email and text message"));
        else if (emailSent) toast.info(t("Staff notified by email"));
        else if (smsSent) toast.info(t("Staff notified by text message"));
        else if (data.notifyStaff !== false) {
          toast.warning(
            reason === "no_contact"
              ? t("Assignment saved but staff has no email or phone on file.")
              : t("Assignment saved but notification could not be sent. Check email settings."),
          );
        }
      }
      setDetailDrawer(null);
      fetchAll();
    } else if (res.status === 409) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? t("Approve event date extension to save"));
    } else toast.error(t("Failed to update assignment"));
  };

  const handleDeleteAssignment = async (type: "staff" | "sub", id: string) => {
    const ep = type === "staff" ? `/api/gantt-project-staff/${id}` : `/api/gantt-project-subs/${id}`;
    const res = await fetch(ep, { method: "DELETE" });
    if (res.ok) { toast.success(t("Assignment removed")); setDetailDrawer(null); fetchAll(); }
    else toast.error(t("Failed to delete assignment"));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "project") await handleDeleteProject(deleteTarget.id);
    else if (deleteTarget.type === "location") await handleDeleteLocation(deleteTarget.id);
    else if (deleteTarget.type === "assignment") await handleDeleteAssignment(deleteTarget.assignmentType, deleteTarget.id);
    setDeleteTarget(null);
  };

  // ── Row rendering helpers ─────────────────────────────────────────────────

  const ROW_H = 44;

  const renderRows = () => {
    const rows: React.ReactNode[] = [];

    for (const project of filteredProjects) {
      const isExpanded = expandedProjects.has(project.id);
      const approvalDot = getApprovalColor(project);
      const barColor = project.color ?? "#3B82F6";

      // Project row
      rows.push(
        <div key={`p-${project.id}`} className="flex border-b border-border/40 hover:bg-muted/5 group"
          style={{ minHeight: ROW_H }}>
          {/* Sidebar cell */}
          <div className="flex items-center gap-1.5 px-2 border-r border-border/40 shrink-0 cursor-pointer sticky left-0 z-[4] bg-card shadow-[1px_0_0_0_hsl(var(--border))]"
            style={{ width: ganttSidebarPx }}
            onClick={() => toggleProject(project.id)}>
            <button className="shrink-0 text-muted-foreground hover:text-foreground">
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: approvalDot }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-snug">{project.name}</p>
              <p className="text-xs text-muted-foreground truncate leading-snug">
                {fmtShort(project.startDate)} - {fmtShort(project.endDate)}
              </p>
            </div>
            <button
              className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
              onClick={e => { e.stopPropagation(); setDetailDrawer({ type: "project", project }); }}>
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* Timeline cell */}
          <div className="relative overflow-hidden shrink-0" style={{ width: timelineWidthPx, height: ROW_H }}>
            <GanttDayGrid days={days} dayColPx={GANTT_DAY_COL_PX} todayIdx={todayIdx} />
            <GanttBar startDate={project.startDate} endDate={project.endDate} color={barColor}
              label={project.name} days={days} dayColPx={GANTT_DAY_COL_PX} height={26} textSize="text-xs" />
          </div>
          <div className="shrink-0 border-l border-border/40 bg-card" style={{ width: GANTT_RIGHT_NAV_PX }} aria-hidden />
        </div>
      );

      if (!isExpanded) continue;

      // Location rows
      for (const loc of project.locations) {
        const locExpanded = expandedLocations.has(loc.id);
        const locColor = loc.color ?? "#6366F1";

        rows.push(
          <div key={`l-${loc.id}`} className="flex border-b border-border/40 bg-muted/5 hover:bg-muted/10 group"
            style={{ minHeight: ROW_H }}>
            <div className="flex items-center gap-1.5 border-r border-border/40 shrink-0 cursor-pointer sticky left-0 z-[4] bg-muted/5 shadow-[1px_0_0_0_hsl(var(--border))]"
              style={{ width: ganttSidebarPx, paddingLeft: 28, paddingRight: 8 }}
              onClick={() => toggleLocation(loc.id)}>
              <button className="shrink-0 text-muted-foreground hover:text-foreground">
                {locExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: locColor }} />
              <span className="flex-1 text-sm truncate">{loc.name}</span>
              <button className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                onClick={e => { e.stopPropagation(); setDetailDrawer({ type: "location", location: loc, project }); }}>
                <Settings className="h-3 w-3" />
              </button>
              <button className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={e => { e.stopPropagation(); setDeleteTarget({ type: "location", id: loc.id, name: loc.name }); }}>
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="relative overflow-hidden shrink-0" style={{ width: timelineWidthPx, height: ROW_H }}>
              <GanttDayGrid days={days} dayColPx={GANTT_DAY_COL_PX} todayIdx={todayIdx} />
              <GanttBar startDate={loc.startDate ?? project.startDate} endDate={loc.endDate ?? project.endDate}
                color={locColor} label={loc.name} days={days} dayColPx={GANTT_DAY_COL_PX} height={22} textSize="text-[11px]" />
            </div>
            <div className="shrink-0 border-l border-border/40 bg-muted/5" style={{ width: GANTT_RIGHT_NAV_PX }} aria-hidden />
          </div>
        );

        if (!locExpanded) continue;

        // Staff assignments
        for (const sa of loc.staffAssignments) {
          const memberName = sa.staff?.name ?? t("Unassigned");
          const memberColor = sa.staff?.color ?? "#3B82F6";
          const saSchedule = assignmentScheduleRange(sa.startDate, sa.endDate, loc, project);
          rows.push(
            <div key={`sa-${sa.id}`} className="flex border-b border-border/40 bg-muted/10 hover:bg-muted/20 group"
              style={{ minHeight: ROW_H }}>
              <div className="flex items-center gap-1.5 border-r border-border/40 shrink-0 sticky left-0 z-[4] bg-muted/10 shadow-[1px_0_0_0_hsl(var(--border))]"
                style={{ width: ganttSidebarPx, paddingLeft: 48, paddingRight: 8 }}>
                <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: memberColor }} />
                <button className="flex-1 text-xs text-left truncate flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => setDetailDrawer({ type: "assignment", assignment: sa, assignmentType: "staff", project, location: loc })}>
                  <span className="font-medium">{t("Staff:")}</span>
                  <span className="truncate">{memberName}</span>
                </button>
                <button className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                  onClick={() => setDetailDrawer({ type: "assignment", assignment: sa, assignmentType: "staff", project, location: loc })}>
                  <Settings className="h-3 w-3" />
                </button>
                <button className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget({ type: "assignment", id: sa.id, name: memberName, assignmentType: "staff" })}>
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="relative overflow-hidden shrink-0" style={{ width: timelineWidthPx, height: ROW_H }}>
                <GanttDayGrid days={days} dayColPx={GANTT_DAY_COL_PX} todayIdx={todayIdx} />
                <GanttStaffScheduleBlocks
                  assignment={sa}
                  barStart={saSchedule.start}
                  barEnd={saSchedule.end}
                  eventEndDate={saSchedule.eventEnd}
                  days={days}
                  dayColPx={GANTT_DAY_COL_PX}
                  conflictDates={staffConflictDates.get(sa.id)}
                  blockHeight={22}
                  onDayClick={(dateKey) =>
                    setDetailDrawer({
                      type: "assignment",
                      assignment: sa,
                      assignmentType: "staff",
                      project,
                      location: loc,
                      focusedDate: dateKey,
                    })
                  }
                />
                <GanttStaffScheduleOffscreenHint
                  barStart={saSchedule.start}
                  barEnd={saSchedule.end}
                  days={days}
                  onNavigate={setCurrentMonth}
                />
              </div>
              <div className="shrink-0 border-l border-border/40 bg-muted/10" style={{ width: GANTT_RIGHT_NAV_PX }} aria-hidden />
            </div>
          );
        }

        // Sub assignments
        for (const ua of loc.subAssignments) {
          const memberName = ua.sub?.name ?? t("Unassigned");
          const memberColor = ua.sub?.color ?? "#8B5CF6";
          const uaBar = assignmentBarRange(ua.startDate, ua.endDate, loc, project);
          rows.push(
            <div key={`ua-${ua.id}`} className="flex border-b border-border/40 bg-muted/10 hover:bg-muted/20 group"
              style={{ minHeight: ROW_H }}>
              <div className="flex items-center gap-1.5 border-r border-border/40 shrink-0 sticky left-0 z-[4] bg-muted/10 shadow-[1px_0_0_0_hsl(var(--border))]"
                style={{ width: ganttSidebarPx, paddingLeft: 48, paddingRight: 8 }}>
                <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: memberColor }} />
                <button className="flex-1 text-xs text-left truncate flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => setDetailDrawer({ type: "assignment", assignment: ua, assignmentType: "sub", project, location: loc })}>
                  <span className="font-medium">{t("Sub:")}</span>
                  <span className="truncate">{memberName}</span>
                </button>
                <button className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                  onClick={() => setDetailDrawer({ type: "assignment", assignment: ua, assignmentType: "sub", project, location: loc })}>
                  <Settings className="h-3 w-3" />
                </button>
                <button className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget({ type: "assignment", id: ua.id, name: memberName, assignmentType: "sub" })}>
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="relative overflow-hidden shrink-0" style={{ width: timelineWidthPx, height: ROW_H }}>
                <GanttDayGrid days={days} dayColPx={GANTT_DAY_COL_PX} todayIdx={todayIdx} />
                <GanttBar startDate={uaBar.start} endDate={uaBar.end} color={memberColor}
                  label={memberName} days={days} dayColPx={GANTT_DAY_COL_PX} height={20} textSize="text-[11px]" />
              </div>
              <div className="shrink-0 border-l border-border/40 bg-muted/10" style={{ width: GANTT_RIGHT_NAV_PX }} aria-hidden />
            </div>
          );
        }

        // Add Staff / Sub buttons
        rows.push(
          <div key={`add-member-${loc.id}`} className="flex border-b border-border/40 bg-muted/10"
            style={{ minHeight: 28 }}>
            <div className="flex items-center gap-3 border-r border-border/40 shrink-0 px-2 sticky left-0 z-[4] bg-muted/10 shadow-[1px_0_0_0_hsl(var(--border))]"
              style={{ width: ganttSidebarPx, paddingLeft: 48 }}>
              <button className="text-xs text-primary hover:underline flex items-center gap-0.5"
                onClick={() => setAddMemberFor({
                  type: "staff",
                  projectId: project.id,
                  locationId: loc.id,
                  defaultStartDate: loc.startDate ?? project.startDate,
                  defaultEndDate: loc.endDate ?? project.endDate,
                })}>
                <Plus className="h-3 w-3" />{t("Add Staff")}
              </button>
              <button className="text-xs text-primary hover:underline flex items-center gap-0.5"
                onClick={() => setAddMemberFor({
                  type: "sub",
                  projectId: project.id,
                  locationId: loc.id,
                  defaultStartDate: loc.startDate ?? project.startDate,
                  defaultEndDate: loc.endDate ?? project.endDate,
                })}>
                <Plus className="h-3 w-3" />{t("Add Sub")}
              </button>
            </div>
            <div className="shrink-0" style={{ width: timelineWidthPx }} />
            <div className="shrink-0 border-l border-border/40 bg-muted/10" style={{ width: GANTT_RIGHT_NAV_PX }} aria-hidden />
          </div>
        );
      }

      // Add Location button
      rows.push(
        <div key={`add-loc-${project.id}`} className="flex border-b border-border/40 bg-muted/5"
          style={{ minHeight: 28 }}>
          <div className="flex items-center border-r border-border/40 shrink-0 px-2 sticky left-0 z-[4] bg-muted/5 shadow-[1px_0_0_0_hsl(var(--border))]"
            style={{ width: ganttSidebarPx, paddingLeft: 28 }}>
            <button className="text-xs text-primary hover:underline flex items-center gap-0.5"
              onClick={() =>
                setAddLocationFor({
                  projectId: project.id,
                  projectName: project.name,
                  projectRefId: project.projectRefId,
                  startDate: project.startDate,
                  endDate: project.endDate,
                })
              }>
              <Plus className="h-3 w-3" />{t("Add Location")}
            </button>
          </div>
          <div className="shrink-0" style={{ width: timelineWidthPx }} />
          <div className="shrink-0 border-l border-border/40 bg-muted/5" style={{ width: GANTT_RIGHT_NAV_PX }} aria-hidden />
        </div>
      );
    }
    return rows;
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* Filters live in Manage Project toolbar when `filters` is passed; keep inline toolbar only for standalone use. */}
      {!filtersProp ? (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Select value={dateRangeFilter} onValueChange={setLocalDateRangeFilter}>
            <SelectTrigger className="h-9 w-full min-w-[170px] text-xs sm:w-auto">
              <span className="mr-1 text-muted-foreground">{t("Added On")}</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("Start Date To End Date")}</SelectItem>
              <SelectItem value="today">{t("Today")}</SelectItem>
              <SelectItem value="last30">{t("Last 30 Days")}</SelectItem>
              <SelectItem value="thisMonth">{t("This Month")}</SelectItem>
              <SelectItem value="lastMonth">{t("Last Month")}</SelectItem>
              <SelectItem value="last90">{t("Last 90 Days")}</SelectItem>
              <SelectItem value="last6m">{t("Last 6 Months")}</SelectItem>
              <SelectItem value="last1y">{t("Last 1 Year")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={clientFilter} onValueChange={setLocalClientFilter}>
            <SelectTrigger className="h-9 w-full min-w-[120px] text-xs sm:w-auto">
              <span className="mr-1 text-muted-foreground">{t("Client")}</span>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("All")}</SelectItem>
              {clientsList.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <span>{c.name}</span>
                  {c.code && <span className="ml-1 text-xs text-muted-foreground">({c.code})</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setLocalStatusFilter}>
            <SelectTrigger className="h-9 w-full min-w-[120px] text-xs sm:w-auto">
              <span className="mr-1 text-muted-foreground">{t("Status")}</span>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("All")}</SelectItem>
              <SelectItem value="active">{t("Active")}</SelectItem>
              <SelectItem value="completed">{t("Completed")}</SelectItem>
              <SelectItem value="on_hold">{t("On Hold")}</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full min-w-[200px] sm:flex-1">
            <Input
              placeholder={t("Start typing to search")}
              value={searchFilter}
              onChange={e => setLocalSearch(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          {!embedded ? (
            <Button onClick={() => setShowCreateProject(true)} className="h-9 w-full shrink-0 sm:ml-auto sm:w-auto">
              <Plus className="mr-1 h-4 w-4" />{t("Add Project")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* ── Main Gantt Area (horizontal + vertical scroll; sticky name column) ─ */}
      <div className="flex flex-1 flex-col border border-border rounded-xl overflow-hidden bg-card relative min-h-0">
        <StaffScheduleLegend />
        <div
          ref={timelineRef}
          className="flex-1 min-h-[280px] sm:min-h-[320px] overflow-auto overscroll-contain touch-pan-x touch-pan-y"
        >
          <div className="inline-block min-w-full align-top" style={{ minWidth: ganttGridMinWidth }}>
            {/* Top nav strip */}
            <div className="flex items-stretch border-b border-border shrink-0 bg-card sticky top-0 z-[6]" style={{ height: 56 }}>
              <div
                className="shrink-0 flex items-end overflow-hidden border-r border-border relative sticky left-0 z-[8] bg-card shadow-[1px_0_0_0_hsl(var(--border))]"
                style={{ width: ganttSidebarPx }}
              >
                <span
                  className="absolute left-1 sm:left-2 font-black text-muted-foreground/10 select-none leading-none pointer-events-none text-4xl sm:text-6xl"
                  aria-hidden
                >
                  {format(currentMonth, "yyyy")}
                </span>
                <div className="relative z-10 px-2 pb-1.5 w-full">
                  <p className="text-sm sm:text-lg font-bold leading-tight truncate pr-8">
                    {format(currentMonth, "MMMM yyyy")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigateMonth(-1)}
                  className="absolute right-1 bottom-1.5 text-muted-foreground hover:text-foreground sm:hidden"
                  aria-label={t("Previous month")}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div className="shrink-0 flex flex-col border-r border-border/40 bg-card" style={{ width: timelineWidthPx }}>
                <div className="flex h-full min-h-[56px]">
                  {days.map((d, i) => {
                    const isWknd = d.getDay() === 0 || d.getDay() === 6;
                    const isTodayDay = isToday(d);
                    return (
                      <div
                        key={i}
                        style={{ width: GANTT_DAY_COL_PX, minWidth: GANTT_DAY_COL_PX, maxWidth: GANTT_DAY_COL_PX }}
                        className={[
                          "flex flex-col items-center justify-center border-r border-border/40 select-none shrink-0 overflow-hidden",
                          isWknd ? "bg-muted/30 text-orange-500/90" : "text-muted-foreground",
                          isTodayDay ? "bg-primary/10 text-primary" : "",
                        ].join(" ")}
                      >
                        <span className="w-full truncate text-center text-[9px] font-medium uppercase leading-none">
                          {format(d, "EEEEE")}
                        </span>
                        <span className={`mt-0.5 w-full truncate text-center text-[11px] font-semibold tabular-nums leading-none ${isTodayDay ? "text-primary" : ""}`}>
                          {format(d, "d")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                className="shrink-0 flex flex-col items-stretch justify-center gap-0.5 px-1 border-l border-border bg-card sticky right-0 z-[8] shadow-[-1px_0_0_0_hsl(var(--border))]"
                style={{ width: GANTT_RIGHT_NAV_PX, minWidth: GANTT_RIGHT_NAV_PX }}
              >
                <button
                  type="button"
                  className="flex items-center justify-center gap-0.5 text-[10px] sm:text-xs border border-border rounded px-1 py-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                  <span className="truncate">{t("Today")}</span>
                </button>
                <div className="flex items-center justify-center gap-0.5">
                  <button type="button" onClick={() => navigateMonth(-1)} className="p-0.5 text-muted-foreground hover:text-foreground" aria-label={t("Previous month")}>
                    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button type="button" onClick={() => navigateMonth(1)} className="p-0.5 text-muted-foreground hover:text-foreground" aria-label={t("Next month")}>
                    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                {t("Loading...")}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2 px-2">
                <p className="font-medium text-center text-sm sm:text-base">{projects.length === 0 ? t("No projects yet.") : t("No projects match your filters.")}</p>
                {projects.length === 0 && (
                  <Button size="sm" onClick={() => setShowCreateProject(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />{t("Create your first project")}
                  </Button>
                )}
              </div>
            ) : (
              renderRows()
            )}
          </div>
        </div>
      </div>

      <Sheet
        open={!!detailDrawer}
        onOpenChange={open => {
          if (!open) setDetailDrawer(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-[440px] overflow-y-auto flex flex-col gap-0 p-0 [&>button.absolute]:hidden"
        >
          {detailDrawer?.type === "project" && (
            <EditProjectPanel
              project={detailDrawer.project}
              clientsList={clientsList}
              onUpdate={data => handleUpdateProject(detailDrawer.project.id, data as Partial<GanttProject>)}
              onDelete={() => setDeleteTarget({ type: "project", id: detailDrawer.project.id, name: detailDrawer.project.name })}
              onClose={() => setDetailDrawer(null)}
              onEditLocation={loc => setDetailDrawer({ type: "location", location: loc, project: detailDrawer.project })}
            />
          )}
          {detailDrawer?.type === "location" && (
            <EditLocationPanel
              location={detailDrawer.location}
              project={detailDrawer.project}
              onUpdate={data => handleUpdateLocation(detailDrawer.location.id, data as Partial<GanttProjectLocation>)}
              onDelete={() => setDeleteTarget({ type: "location", id: detailDrawer.location.id, name: detailDrawer.location.name })}
              onClose={() => setDetailDrawer(null)}
            />
          )}
          {detailDrawer?.type === "assignment" && (
            <GanttEditAssignmentPanel
              key={`${detailDrawer.assignment.id}:${detailDrawer.focusedDate ?? ""}`}
              assignment={detailDrawer.assignment}
              assignmentType={detailDrawer.assignmentType}
              project={detailDrawer.project}
              location={detailDrawer.location}
              staffList={staffList}
              subsList={subsList}
              clockMap={clockMap}
              focusedDate={detailDrawer.focusedDate}
              onUpdate={data => handleUpdateAssignment(detailDrawer.assignmentType, detailDrawer.assignment.id, data)}
              onDelete={() => {
                const atype = detailDrawer.assignmentType;
                const a = detailDrawer.assignment;
                const name =
                  atype === "staff"
                    ? ((a as GanttProjectStaff).staff?.name ?? "Staff Member")
                    : ((a as GanttProjectSub).sub?.name ?? "Sub-contractor");
                setDeleteTarget({ type: "assignment", id: a.id, name, assignmentType: atype });
              }}
              onClose={() => setDetailDrawer(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <CreateProjectModal
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onCreated={fetchAll}
        clientsList={clientsList}
      />

      {addLocationFor && (
        <AddLocationModal
          projectId={addLocationFor.projectId}
          projectName={addLocationFor.projectName}
          projectRefId={addLocationFor.projectRefId}
          projectStartDate={addLocationFor.startDate}
          projectEndDate={addLocationFor.endDate}
          onClose={() => setAddLocationFor(null)}
          onCreated={fetchAll}
        />
      )}

      {addMemberFor && (
        <AddMemberModal
          type={addMemberFor.type}
          projectId={addMemberFor.projectId}
          locationId={addMemberFor.locationId}
          defaultStartDate={addMemberFor.defaultStartDate}
          defaultEndDate={addMemberFor.defaultEndDate}
          list={addMemberFor.type === "staff" ? staffList : subsList}
          existingStaffAssignments={collectAllStaffAssignments(projects)}
          onClose={() => setAddMemberFor(null)}
          onCreated={fetchAll}
        />
      )}

      <ProjectDrawer
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("Confirm Delete")}
        description={`${t("Are you sure you want to delete")} “${deleteTarget?.name ?? ""}”? ${t("This action cannot be undone.")}`}
        narrow
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t("Cancel")}</Button>
            <Button variant="destructive" onClick={confirmDelete}>{t("Delete")}</Button>
          </>
        }
      >
        <span className="sr-only">{t("Confirm delete")}</span>
      </ProjectDrawer>
    </div>
  );
});

export default ProjectGantt;
