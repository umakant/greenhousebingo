"use client";

import * as React from "react";
import Link from "next/link";
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  DollarSign,
  Download,
  Filter,
  LayoutGrid,
  MapPin,
  PanelRightOpen,
  Plus,
  Send,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { GanttEditAssignmentDrawer } from "@/components/gantt/gantt-edit-assignment-drawer";
import { ProjectDrawer } from "@/components/projects/project-drawer";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { calcHoursFromTimes } from "@/lib/project-staff-hours";
import { toast } from "sonner";
import {
  GANTT_STAFF_DAY_COLORS,
  GANTT_STAFF_DAY_STATUS_ORDER,
  resolveScheduleRowStaffStatus,
  staffDayStatusCellStyle,
  staffDayStatusColor,
  staffDayStatusLabel,
  type GanttStaffDayStatus,
} from "@/lib/gantt-staff-day-status";

export type ScheduleTabProject = {
  id: number;
  name?: string;
  start_date: string | null;
  end_date: string | null;
  city?: string | null;
  state?: string | null;
  budget?: number | string | null;
  num_agents?: number | null;
  num_medics?: number | null;
  num_security?: number | null;
};

type ScheduleRow = {
  id: number;
  role: string;
  type: string;
  name: string;
  position: string;
  start_time: string | null;
  end_time: string | null;
  hours: number | null;
  status: string;
  on_site: boolean;
  work_date: string | null;
  gantt_assignment_id: string | null;
};

type StaffLine = {
  key: string;
  name: string;
  role: string;
  roleLabel: string;
  position: string;
  byDate: Map<string, ScheduleRow>;
  totalHours: number;
};

type GroupBy = "role" | "position" | "staff";

const ROLE_GROUP: Record<string, { label: string; order: number }> = {
  medic: { label: "MEDICS", order: 0 },
  security: { label: "SECURITY", order: 1 },
  agent: { label: "AGENTS", order: 2 },
};

const HOURLY_RATE = 42;

function parseDay(s: string | null | undefined): Date | null {
  if (!s) return null;
  try {
    return parseISO(s.length <= 10 ? `${s}T12:00:00` : s);
  } catch {
    return null;
  }
}

function formatShiftTime(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  return `${start} – ${end}`;
}

function scheduleShiftCellStyle(status: GanttStaffDayStatus): React.CSSProperties {
  return staffDayStatusCellStyle(status);
}

function resolveScheduleRowStatus(row: ScheduleRow): GanttStaffDayStatus {
  return resolveScheduleRowStaffStatus(row.status, row.on_site);
}

function cellForRow(row: ScheduleRow | undefined): {
  label: string;
  className?: string;
  style?: React.CSSProperties;
  kind: "off" | "open" | GanttStaffDayStatus;
} {
  if (!row) {
    return { label: "OFF", className: "bg-muted/60 text-muted-foreground border-transparent", kind: "off" };
  }

  const status = resolveScheduleRowStatus(row);
  return {
    label: formatShiftTime(row.start_time, row.end_time),
    style: scheduleShiftCellStyle(status),
    kind: status,
  };
}

function buildStaffLines(rows: ScheduleRow[]): StaffLine[] {
  const map = new Map<string, StaffLine>();
  for (const row of rows) {
    const key = `${row.role}::${row.name}::${row.position}`;
    let line = map.get(key);
    if (!line) {
      line = {
        key,
        name: row.name,
        role: row.role,
        roleLabel: row.type,
        position: row.position || "—",
        byDate: new Map(),
        totalHours: 0,
      };
      map.set(key, line);
    }
    if (row.work_date) {
      line.byDate.set(row.work_date, row);
      line.totalHours += row.hours ?? calcHoursFromTimes(row.start_time, row.end_time);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function groupLines(lines: StaffLine[], groupBy: GroupBy): Array<{ title: string; lines: StaffLine[] }> {
  if (groupBy === "staff") {
    return [{ title: "ALL STAFF", lines }];
  }
  const groups = new Map<string, StaffLine[]>();
  for (const line of lines) {
    const title =
      groupBy === "position"
        ? (line.position || "UNASSIGNED").toUpperCase()
        : ROLE_GROUP[line.role]?.label ?? line.role.toUpperCase();
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title)!.push(line);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (groupBy !== "role") return a.localeCompare(b);
      const orderA = Object.values(ROLE_GROUP).find((g) => g.label === a)?.order ?? 99;
      const orderB = Object.values(ROLE_GROUP).find((g) => g.label === b)?.order ?? 99;
      return orderA - orderB;
    })
    .map(([title, groupLines]) => ({ title, lines: groupLines }));
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
        </div>
        <div className={cn("rounded-lg p-2", accent ?? "bg-primary/10 text-primary")}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function ScheduleTab({
  projectId,
  project,
  canManage = false,
  leadName,
}: {
  projectId: number;
  project?: ScheduleTabProject;
  canManage?: boolean;
  leadName?: string | null;
}) {
  const { settings } = useAppSettings();
  const [rows, setRows] = React.useState<ScheduleRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [groupBy, setGroupBy] = React.useState<GroupBy>("role");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [insightsOpen, setInsightsOpen] = React.useState(false);
  const [assignmentEditor, setAssignmentEditor] = React.useState<{
    ganttAssignmentId: string;
    focusedDate: string;
  } | null>(null);

  const openAssignmentEditor = React.useCallback((row: ScheduleRow, dateKey: string) => {
    const ganttId =
      row.gantt_assignment_id ??
      rows.find(
        (r) =>
          r.gantt_assignment_id &&
          r.name === row.name &&
          r.role === row.role &&
          r.position === row.position,
      )?.gantt_assignment_id ??
      null;

    if (!ganttId) {
      toast.info("This shift is not linked to a Gantt assignment yet. Open the Gantt chart and assign staff first.");
      return;
    }
    setAssignmentEditor({ ganttAssignmentId: ganttId, focusedDate: dateKey });
  }, [rows]);

  const projectStart = parseDay(project?.start_date);
  const projectEnd = parseDay(project?.end_date);
  const [weekAnchor, setWeekAnchor] = React.useState(() =>
    startOfWeek(projectStart ?? new Date(), { weekStartsOn: 1 }),
  );

  React.useEffect(() => {
    if (!project?.start_date) return;
    const d = parseDay(project.start_date);
    if (!d) return;
    setWeekAnchor(startOfWeek(d, { weekStartsOn: 1 }));
  }, [project?.start_date]);

  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekAnchor, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const [opsMeta, setOpsMeta] = React.useState<{
    num_agents?: number | null;
    num_medics?: number | null;
    num_security?: number | null;
  }>({});

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/project/${projectId}/schedule`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/project/${projectId}/operations`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([scheduleRes, opsRes]) => {
        setRows(Array.isArray(scheduleRes.data) ? scheduleRes.data : []);
        const p = opsRes?.project;
        if (p) {
          setOpsMeta({
            num_agents: p.num_agents ?? null,
            num_medics: p.num_medics ?? null,
            num_security: p.num_security ?? null,
          });
        }
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      r.position.toLowerCase().includes(q)
    );
  });

  const staffLines = buildStaffLines(filtered);
  const grouped = groupLines(staffLines, groupBy);

  const totalHours = filtered.reduce(
    (sum, r) => sum + (r.hours ?? calcHoursFromTimes(r.start_time, r.end_time)),
    0,
  );
  const uniqueStaff = new Set(filtered.map((r) => r.name)).size;
  const requiredStaff =
    (project?.num_agents ?? opsMeta.num_agents ?? 0) +
    (project?.num_medics ?? opsMeta.num_medics ?? 0) +
    (project?.num_security ?? opsMeta.num_security ?? 0);
  const openSlots = requiredStaff > 0 ? Math.max(0, requiredStaff - uniqueStaff) : 0;
  const coveragePct =
    requiredStaff > 0 ? Math.min(100, Math.round((uniqueStaff / requiredStaff) * 100)) : 100;

  const dailyCoverage = weekDays.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const dayRows = filtered.filter((r) => r.work_date === key);
    const staffed = new Set(dayRows.map((r) => r.name)).size;
    const pct = requiredStaff > 0 ? Math.round((staffed / requiredStaff) * 100) : staffed > 0 ? 100 : 0;
    return { date: key, label: format(day, "MMM d"), pct, staffed };
  });

  const alerts = React.useMemo(() => {
    const items: string[] = [];
    if (openSlots > 0) items.push(`${openSlots} open position${openSlots === 1 ? "" : "s"} on roster`);
    for (const line of staffLines) {
      if (line.totalHours > 48) items.push(`${line.name} overtime risk (${line.totalHours}h)`);
    }
    const conflictDays = new Set<string>();
    const byDateName = new Map<string, Set<string>>();
    for (const r of filtered) {
      if (!r.work_date) continue;
      const k = `${r.work_date}::${r.name}`;
      if (byDateName.has(k)) conflictDays.add(r.work_date);
      byDateName.set(k, new Set());
    }
    if (conflictDays.size) items.push(`${conflictDays.size} day(s) with duplicate assignments`);
    return items.slice(0, 4);
  }, [filtered, openSlots, staffLines]);

  const locationLabel = [project?.city, project?.state].filter(Boolean).join(", ") || "—";

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Total Assignments" value={String(filtered.length)} icon={CalendarDays} />
        <KpiCard label="Staff Assigned" value={String(uniqueStaff)} icon={Users} accent="bg-violet-100 text-violet-700" />
        <KpiCard
          label="Open Slots"
          value={String(openSlots)}
          sub={requiredStaff ? `of ${requiredStaff} required` : undefined}
          icon={UserPlus}
          accent="bg-amber-100 text-amber-700"
        />
        <button type="button" className="text-left" onClick={() => setInsightsOpen(true)}>
          <KpiCard
            label="Coverage"
            value={`${coveragePct}%`}
            icon={Sparkles}
            accent="bg-sky-100 text-sky-700"
          />
        </button>
        <KpiCard
          label="Total Hours"
          value={`${Math.round(totalHours)}`}
          sub="scheduled"
          icon={Clock}
          accent="bg-emerald-100 text-emerald-700"
        />
        <KpiCard
          label="Labor Est."
          value={`$${Math.round(totalHours * HOURLY_RATE).toLocaleString()}`}
          icon={DollarSign}
          accent="bg-rose-100 text-rose-700"
        />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Schedule ({filtered.length} assignments)
              </h3>
              <p className="text-sm text-muted-foreground">
                {leadName ? `Lead: ${leadName} · ` : ""}
                {locationLabel}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManage ? (
                <Button size="sm" asChild>
                  <Link href="/projects?view=gantt">
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Assign Staff
                  </Link>
                </Button>
              ) : null}
              <Button size="sm" variant="outline" asChild>
                <Link href={`/project/${projectId}?tab=position`}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Positions
                </Link>
              </Button>
              <Button size="sm" variant="outline" disabled title="Coming soon">
                <Sparkles className="mr-1.5 h-4 w-4" />
                Wizard
              </Button>
              <Button
                size="sm"
                variant={viewMode === "grid" ? "secondary" : "outline"}
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              >
                <LayoutGrid className="mr-1.5 h-4 w-4" />
                {viewMode === "grid" ? "List" : "Grid"}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={`/api/project/${projectId}/schedule`} download>
                  <Download className="mr-1.5 h-4 w-4" />
                  Export
                </a>
              </Button>
              <Button size="sm" variant="outline" onClick={() => setInsightsOpen(true)}>
                <PanelRightOpen className="mr-1.5 h-4 w-4" />
                Staffing Insights
                {alerts.length > 0 ? (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 rounded-full px-1 text-[10px]">
                    {alerts.length}
                  </Badge>
                ) : null}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role">Group by Role</SelectItem>
                  <SelectItem value="position">Group by Position</SelectItem>
                  <SelectItem value="staff">All Staff</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-9" disabled>
                <Filter className="mr-1.5 h-4 w-4" />
                Filters
              </Button>
            </div>
            <div className="flex flex-1 items-center gap-2 sm:max-w-md">
              <Input
                placeholder="Search by name, position, or type…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setWeekAnchor((w) => subWeeks(w, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[140px] text-center text-sm font-medium text-foreground">
                {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setWeekAnchor((w) => addWeeks(w, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading schedule…</p>
            ) : viewMode === "list" ? (
              <ScheduleListView rows={filtered} settings={settings} />
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium text-foreground">No schedule entries yet</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Assign staff in the Gantt chart to mirror shifts here automatically.
                </p>
                {canManage ? (
                  <Button size="sm" className="mt-4" asChild>
                    <Link href="/projects?view=gantt">Open Gantt Schedule</Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-[900px] w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="sticky left-0 z-10 min-w-[200px] bg-muted/40 px-3 py-2.5">Position / Staff</th>
                      {weekDays.map((day) => (
                        <th key={day.toISOString()} className="min-w-[108px] px-2 py-2.5 text-center font-medium">
                          <div>{format(day, "EEE")}</div>
                          <div className="text-[10px] font-normal normal-case text-muted-foreground">
                            {format(day, "MMM d")}
                          </div>
                        </th>
                      ))}
                      <th className="min-w-[72px] px-3 py-2.5 text-right">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map((group) => (
                      <React.Fragment key={group.title}>
                        <tr className="bg-muted/30">
                          <td
                            colSpan={weekDays.length + 2}
                            className="sticky left-0 px-3 py-2 text-xs font-bold tracking-wider text-muted-foreground"
                          >
                            {group.title}
                          </td>
                        </tr>
                        {group.lines.map((line) => {
                          const weekHours = weekDays.reduce((sum, day) => {
                            const key = format(day, "yyyy-MM-dd");
                            const row = line.byDate.get(key);
                            return sum + (row ? (row.hours ?? calcHoursFromTimes(row.start_time, row.end_time)) : 0);
                          }, 0);
                          return (
                            <tr key={line.key} className="border-t border-border/60 hover:bg-muted/20">
                              <td className="sticky left-0 z-10 bg-card px-3 py-2">
                                <div className="font-medium text-foreground">{line.name}</div>
                                <div className="text-xs text-muted-foreground">{line.position}</div>
                              </td>
                              {weekDays.map((day) => {
                                const key = format(day, "yyyy-MM-dd");
                                const row = line.byDate.get(key);
                                const cell = cellForRow(row);
                                const inRange =
                                  !projectStart ||
                                  !projectEnd ||
                                  isWithinInterval(day, { start: projectStart, end: projectEnd });
                                if (!inRange && !row) {
                                  return (
                                    <td key={key} className="px-1 py-1.5">
                                      <div className="rounded-md border border-transparent bg-muted/30 px-1 py-2 text-center text-[10px] text-muted-foreground">
                                        —
                                      </div>
                                    </td>
                                  );
                                }
                                return (
                                  <td key={key} className="px-1 py-1.5">
                                    <button
                                      type="button"
                                      disabled={!row}
                                      onClick={() => row && openAssignmentEditor(row, key)}
                                      className={cn(
                                        "w-full rounded-md border px-1 py-2 text-center text-[10px] font-medium leading-tight shadow-sm ring-1 ring-black/5 transition-opacity",
                                        row ? "cursor-pointer hover:opacity-90" : "cursor-default",
                                        cell.className,
                                      )}
                                      style={cell.style}
                                      title={
                                        row
                                          ? cell.kind === "off" || cell.kind === "open"
                                            ? "Click to edit assignment"
                                            : `${staffDayStatusLabel(cell.kind)} · Click to edit assignment`
                                          : undefined
                                      }
                                    >
                                      {cell.label}
                                    </button>
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2 text-right tabular-nums font-medium text-foreground">
                                {weekHours > 0 ? `${weekHours}h` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                        {openSlots > 0 && groupBy === "role" && group.title === "AGENTS" ? (
                          <tr className="border-t border-dashed">
                            <td className="sticky left-0 bg-card px-3 py-2 text-sm text-muted-foreground">
                              Open slot
                            </td>
                            {weekDays.map((day) => {
                              const key = format(day, "yyyy-MM-dd");
                              const hasAny = group.lines.some((l) => l.byDate.has(key));
                              return (
                                <td key={key} className="px-1 py-1.5">
                                  {!hasAny ? (
                                    <div
                                      className="rounded-md border-2 border-dashed px-1 py-2 text-center text-[10px] font-semibold shadow-sm"
                                      style={{
                                        borderColor: GANTT_STAFF_DAY_COLORS.begin,
                                        color: "#374151",
                                        backgroundColor: `${GANTT_STAFF_DAY_COLORS.begin}`,
                                      }}
                                    >
                                      OPEN
                                    </div>
                                  ) : (
                                    <div className="rounded-md border border-transparent px-1 py-2 text-center text-[10px] text-muted-foreground">
                                      —
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td />
                          </tr>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {GANTT_STAFF_DAY_STATUS_ORDER.map((status) => (
                <LegendDot
                  key={status}
                  color={staffDayStatusColor(status)}
                  label={staffDayStatusLabel(status)}
                  dashed={status === "begin"}
                />
              ))}
              <LegendDot className="bg-muted-foreground/40" label="Off" />
              <LegendDot color={GANTT_STAFF_DAY_COLORS.begin} label="Open Slot" dashed />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled>
                <Copy className="mr-1.5 h-4 w-4" />
                Clone Week
              </Button>
              <Button size="sm" variant="outline" disabled>
                <Sparkles className="mr-1.5 h-4 w-4" />
                Generate Shifts
              </Button>
              <Button size="sm" variant="outline" disabled>
                <Send className="mr-1.5 h-4 w-4" />
                Send Confirmations
              </Button>
            </div>
          </div>
        </div>

      <GanttEditAssignmentDrawer
        open={assignmentEditor !== null}
        onOpenChange={(open) => {
          if (!open) setAssignmentEditor(null);
        }}
        ganttAssignmentId={assignmentEditor?.ganttAssignmentId ?? null}
        focusedDate={assignmentEditor?.focusedDate}
        onSaved={load}
      />

      <ProjectDrawer
        open={insightsOpen}
        onOpenChange={setInsightsOpen}
        title="Staffing Insights"
        description={`Coverage and alerts for ${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`}
        narrow
        scrollable
      >
        <ScheduleStaffingInsights
          coveragePct={coveragePct}
          openSlots={openSlots}
          uniqueStaff={uniqueStaff}
          totalHours={totalHours}
          dailyCoverage={dailyCoverage}
          alerts={alerts}
          budget={project?.budget}
        />
      </ProjectDrawer>
    </div>
  );
}

function ScheduleStaffingInsights({
  coveragePct,
  openSlots,
  uniqueStaff,
  totalHours,
  dailyCoverage,
  alerts,
  budget,
}: {
  coveragePct: number;
  openSlots: number;
  uniqueStaff: number;
  totalHours: number;
  dailyCoverage: Array<{ date: string; label: string; pct: number; staffed: number }>;
  alerts: string[];
  budget?: number | string | null;
}) {
  return (
    <div className="space-y-4 px-6 py-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-foreground">Live Staffing Status</h4>
        <div className="mt-4 flex flex-col items-center">
          <div
            className="relative flex h-28 w-28 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#6366f1 ${coveragePct * 3.6}deg, hsl(var(--muted)) 0deg)`,
            }}
          >
            <div className="flex h-[88px] w-[88px] flex-col items-center justify-center rounded-full bg-card">
              <span className="text-2xl font-bold tabular-nums text-foreground">{coveragePct}%</span>
              <span className="text-[10px] text-muted-foreground">Coverage</span>
            </div>
          </div>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Open positions</dt>
            <dd className="font-medium text-amber-600">{openSlots}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Staff assigned</dt>
            <dd className="font-medium">{uniqueStaff}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Total hours</dt>
            <dd className="font-medium">{Math.round(totalHours)}h</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-foreground">Daily Coverage</h4>
        <ul className="mt-3 space-y-2">
          {dailyCoverage.map((d) => (
            <li key={d.date} className="flex items-center gap-2 text-xs">
              <span className="w-14 shrink-0 text-muted-foreground">{d.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    d.pct >= 90 ? "bg-emerald-500" : d.pct >= 70 ? "bg-amber-500" : "bg-rose-500",
                  )}
                  style={{ width: `${d.pct}%` }}
                />
              </div>
              <span className="w-8 text-right tabular-nums font-medium">{d.pct}%</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Staffing Alerts
        </h4>
        {alerts.length ? (
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            {alerts.map((a) => (
              <li key={a} className="flex gap-2 rounded-md bg-amber-50 px-2 py-1.5 text-amber-900">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {a}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">No staffing alerts this week.</p>
        )}
      </div>

      {budget != null ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">Project Budget</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            ${Number(budget).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Est. labor {Math.round((totalHours * HOURLY_RATE) / Math.max(Number(budget), 1) * 100)}% of budget
          </p>
        </div>
      ) : null}
    </div>
  );
}

function LegendDot({
  color,
  className,
  label,
  dashed,
}: {
  color?: string;
  className?: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-[3px] ring-1 ring-black/10",
          dashed && "border border-dashed bg-transparent",
          className,
        )}
        style={color ? { backgroundColor: dashed ? "transparent" : color, borderColor: dashed ? color : undefined } : undefined}
      />
      {label}
    </span>
  );
}

function ScheduleListView({
  rows,
  settings,
}: {
  rows: ScheduleRow[];
  settings: Record<string, string>;
}) {
  const byDate = new Map<string, ScheduleRow[]>();
  for (const r of rows) {
    const d = r.work_date ?? "Unscheduled";
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(r);
  }

  return (
    <div className="space-y-6">
      {Array.from(byDate.entries()).map(([date, items]) => (
        <div key={date}>
          <h4 className="mb-2 text-sm font-medium text-foreground">
            {date === "Unscheduled" ? date : fmtDateLib(date, settings)}
          </h4>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Position</th>
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">Hours</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">On Site</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <Badge variant="outline">{r.type}</Badge>
                    </td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.position}</td>
                    <td className="px-3 py-2">{formatShiftTime(r.start_time, r.end_time)}</td>
                    <td className="px-3 py-2">{r.hours ? `${r.hours}h` : "—"}</td>
                    <td className="px-3 py-2 capitalize">{r.status}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      {r.on_site ? "On Site" : "Off Site"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
