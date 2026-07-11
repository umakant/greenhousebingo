"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  ListChecks,
  Loader2,
  Plus,
  ShieldAlert,
  Info,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  SheetDescription,
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
import { TableActionButton } from "@/components/ui/table-action-button";
import {
  ACTIVITY_FILTER_CATEGORIES,
  CHECKLIST_CATEGORIES,
} from "@/lib/event-platform/event-operations/activity-constants";
import type {
  EventActivityRow,
  EventOperationsFilters,
  EventOperationsOverview,
} from "@/lib/event-platform/event-operations/event-operations-types";
import type { ExtendedAlert } from "@/lib/event-platform/event-operations/event-alert-engine";
import { cn } from "@/lib/utils";

function buildQuery(eventId: string, filters: EventOperationsFilters) {
  const p = new URLSearchParams();
  if (filters.dateFrom) p.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) p.set("dateTo", filters.dateTo);
  if (filters.category && filters.category !== "all") p.set("category", filters.category);
  if (filters.activityType) p.set("activityType", filters.activityType);
  if (filters.userId) p.set("userId", filters.userId);
  const q = p.toString();
  return `/api/event-platform/events/${encodeURIComponent(eventId)}/operations${q ? `?${q}` : ""}`;
}

function alertIcon(severity: ExtendedAlert["severity"]) {
  if (severity === "critical") return ShieldAlert;
  if (severity === "warning") return AlertTriangle;
  return Info;
}

function formatTs(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function ActivityDrawer(props: {
  row: EventActivityRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const row = props.row;
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{row?.activityLabel ?? "Activity detail"}</SheetTitle>
          <SheetDescription>{row ? formatTs(row.timestamp) : ""}</SheetDescription>
        </SheetHeader>
        {row ? (
          <div className="mt-6 space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Description</p>
              <p>{row.description}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">User</p>
              <p>{row.userName ?? "System"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Related entity</p>
              <p>
                {row.entityType}
                {row.entityId ? ` #${row.entityId}` : ""}
              </p>
            </div>
            {row.source ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Source</p>
                <p>{row.source}</p>
              </div>
            ) : null}
            {row.before && Object.keys(row.before).length > 0 ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Before</p>
                <ul className="mt-1 space-y-1 rounded-md border p-2">
                  {Object.entries(row.before).map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-mono text-xs">{String(v)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {row.after && Object.keys(row.after).length > 0 ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground">After</p>
                <ul className="mt-1 space-y-1 rounded-md border p-2">
                  {Object.entries(row.after).map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-mono text-xs">{String(v)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {row.metadataFormatted.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Metadata</p>
                <ul className="mt-1 space-y-1 rounded-md border p-2">
                  {row.metadataFormatted.map((m) => (
                    <li key={m.key} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{m.key}</span>
                      <span className="text-right text-xs">{m.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function OverviewStatCard(props: {
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  label: string;
  value: string;
  hint?: string;
  progress?: number;
  progressColor?: string;
}) {
  const { icon: Icon, tint, label, value, hint, progress, progressColor } = props;
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex items-start gap-3 p-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tint)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold leading-tight tracking-tight tabular-nums">{value}</p>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {progress != null ? (
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", progressColor ?? "bg-primary")}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          ) : hint ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function CompletionDonut(props: { completed: number; pending: number; overdue: number; percent: number }) {
  const { completed, pending, overdue, percent } = props;
  const total = completed + pending + overdue;
  const size = 150;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const segments = [
    { value: completed, color: "#16a34a" },
    { value: pending, color: "#f59e0b" },
    { value: overdue, color: "#ef4444" },
  ];
  let offset = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s, i) => {
      const frac = total > 0 ? s.value / total : 0;
      const dash = frac * circ;
      const el = (
        <circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={s.color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={-offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      );
      offset += dash;
      return el;
    });
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        {arcs}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{percent}%</span>
        <span className="text-[11px] text-muted-foreground">Complete</span>
      </div>
    </div>
  );
}

function taskStatusMeta(status: string, isOverdue: boolean): { label: string; className: string } {
  if (status === "completed") return { label: "Completed", className: "text-emerald-600" };
  if (status === "cancelled") return { label: "Cancelled", className: "text-muted-foreground" };
  if (isOverdue) return { label: "Overdue", className: "text-red-600" };
  return { label: "Pending", className: "text-amber-600" };
}

function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

export function EventOperationsTab(props: { eventId: string }) {
  const [overview, setOverview] = React.useState<EventOperationsOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<EventOperationsFilters>({ category: "all" });
  const [selectedActivity, setSelectedActivity] = React.useState<EventActivityRow | null>(null);
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [newTaskCategory, setNewTaskCategory] = React.useState<string>("Staff");
  const [showAddRow, setShowAddRow] = React.useState(false);
  const [taskCategoryFilter, setTaskCategoryFilter] = React.useState<string>("all");
  const [taskStatusFilter, setTaskStatusFilter] = React.useState<string>("all");
  const [taskStaffFilter, setTaskStaffFilter] = React.useState<string>("all");
  const checklistRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch(buildQuery(props.eventId, filters), { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      overview?: EventOperationsOverview;
      message?: string;
    };
    if (!res.ok || !data?.ok || !data.overview) {
      toast.error(data?.message ?? "Could not load activity data.");
      setOverview(null);
    } else {
      setOverview(data.overview);
    }
    setLoading(false);
  }, [props.eventId, filters]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: string, body: Record<string, unknown> = {}) {
    const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/operations/actions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Action failed.");
      return false;
    }
    toast.success("Updated.");
    await load();
    return true;
  }

  if (loading && !overview) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading activity & operations…
      </div>
    );
  }

  if (!overview) {
    return <p className="text-sm text-muted-foreground">Operations data is unavailable.</p>;
  }

  const canManage = overview.canManage;
  const exportHref = `/api/event-platform/events/${encodeURIComponent(props.eventId)}/operations/export`;

  const tasks = overview.checklist.tasks;
  const total = overview.checklist.total;
  const completed = overview.checklist.completed;
  const percent = overview.checklist.percent;
  const overdue = overview.checklist.overdue;
  const cancelled = tasks.filter((t) => t.status === "cancelled").length;
  const pendingCount = Math.max(0, total - completed - cancelled);
  const donutPending = Math.max(0, pendingCount - overdue);
  const assignedToMe = overview.currentUserId
    ? tasks.filter((t) => t.assignedToId === overview.currentUserId).length
    : 0;

  const staffOptions = Array.from(
    new Set(tasks.map((t) => t.assignedToName).filter((n): n is string => Boolean(n))),
  );
  const taskFiltersActive = taskCategoryFilter !== "all" || taskStatusFilter !== "all" || taskStaffFilter !== "all";
  const filteredTasks = tasks.filter((t) => {
    if (taskCategoryFilter !== "all" && t.category !== taskCategoryFilter) return false;
    if (taskStaffFilter !== "all") {
      if (taskStaffFilter === "unassigned" ? Boolean(t.assignedToName) : t.assignedToName !== taskStaffFilter) return false;
    }
    if (taskStatusFilter !== "all") {
      if (taskStatusFilter === "overdue") return t.isOverdue;
      if (taskStatusFilter === "pending") return t.status !== "completed" && t.status !== "cancelled" && !t.isOverdue;
      return t.status === taskStatusFilter;
    }
    return true;
  });

  function scrollToChecklist() {
    checklistRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function addTask() {
    void runAction("add_task", { title: newTaskTitle.trim(), category: newTaskCategory }).then((ok) => {
      if (ok) {
        setNewTaskTitle("");
        setShowAddRow(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      {overview.alerts.length > 0 ? (
        <div className="space-y-2">
          {overview.alerts.map((alert) => {
            const Icon = alertIcon(alert.severity);
            return (
              <Card
                key={alert.id}
                className={cn(
                  "shadow-sm border",
                  alert.severity === "critical" && "border-red-200 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/20",
                  alert.severity === "warning" && "border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/20",
                  alert.severity === "info" && "border-sky-200 bg-sky-50/80 dark:border-sky-900/50 dark:bg-sky-950/20",
                )}
              >
                <CardContent className="flex gap-3 p-4">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.explanation ?? alert.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Recommended: {alert.recommendedAction ?? alert.actionLabel}
                    </p>
                  </div>
                  {alert.dismissible && canManage ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => void runAction("dismiss_alert", { alertKey: alert.id })}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Dismiss</span>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* Activity overview header + stat cards */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Activity Overview</h2>
          <p className="text-sm text-muted-foreground">Track operational readiness and the event audit trail.</p>
        </div>
        {canManage ? (
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              setShowAddRow(true);
              scrollToChecklist();
            }}
          >
            <Plus className="h-4 w-4" />
            Add task
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewStatCard
          icon={CheckCircle2}
          tint="bg-emerald-100 text-emerald-600"
          label="Tasks completed"
          value={`${completed} / ${total}`}
          progress={percent}
          progressColor="bg-emerald-500"
        />
        <OverviewStatCard
          icon={Clock}
          tint="bg-amber-100 text-amber-600"
          label="Pending tasks"
          value={String(pendingCount)}
          hint="Awaiting action"
        />
        <OverviewStatCard
          icon={Users}
          tint="bg-blue-100 text-blue-600"
          label="Assigned to you"
          value={String(assignedToMe)}
          hint={assignedToMe > 0 ? "Tasks assigned to you" : "—"}
        />
        <OverviewStatCard
          icon={AlertTriangle}
          tint={overdue > 0 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}
          label="Overdue tasks"
          value={String(overdue)}
          hint={overdue > 0 ? "Needs attention" : "Stay on track"}
        />
      </div>

      {/* Main: checklist + activity log (left) · sidebar (right) */}
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="shadow-sm" ref={checklistRef}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Operational Checklist</CardTitle>
                  <CardDescription>
                    {completed} of {total} complete
                    {overdue > 0 ? ` · ${overdue} overdue` : ""}
                  </CardDescription>
                </div>
                <Badge variant="outline">{percent}%</Badge>
              </div>
              <Progress value={percent} className="mt-2 h-2" />
            </CardHeader>
            <CardContent className="space-y-3">
              {canManage && showAddRow ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
                  <Input
                    className="h-8 max-w-xs"
                    placeholder="New task title…"
                    autoFocus
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTaskTitle.trim()) addTask();
                    }}
                  />
                  <Select value={newTaskCategory} onValueChange={setNewTaskCategory}>
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHECKLIST_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-8" disabled={!newTaskTitle.trim()} onClick={addTask}>
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => {
                      setShowAddRow(false);
                      setNewTaskTitle("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : null}

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={taskCategoryFilter} onValueChange={setTaskCategoryFilter}>
                  <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CHECKLIST_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={taskStaffFilter} onValueChange={setTaskStaffFilter}>
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All staff</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {staffOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {taskFiltersActive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => {
                      setTaskCategoryFilter("all");
                      setTaskStatusFilter("all");
                      setTaskStaffFilter("all");
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Task</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      {canManage ? <TableHead /> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canManage ? 7 : 6} className="text-muted-foreground">
                          No tasks match these filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTasks.map((task) => {
                        const meta = taskStatusMeta(task.status, task.isOverdue);
                        return (
                          <TableRow key={task.id} className={task.isOverdue ? "bg-amber-50/50 dark:bg-amber-950/10" : undefined}>
                            <TableCell>
                              {task.status === "completed" ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Circle className={cn("h-4 w-4", task.isOverdue ? "text-red-500" : "text-muted-foreground")} />
                              )}
                            </TableCell>
                            <TableCell className="text-xs font-medium">{task.title}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{task.category}</TableCell>
                            <TableCell className="text-xs">{task.assignedToName ?? "—"}</TableCell>
                            <TableCell className="text-xs">{task.dueAt ? formatTs(task.dueAt) : "—"}</TableCell>
                            <TableCell>
                              <span className={cn("text-xs font-semibold", meta.className)}>{meta.label}</span>
                            </TableCell>
                            {canManage ? (
                              <TableCell>
                                <TableActionButton
                                  label="Actions"
                                  items={[
                                    ...(task.status !== "completed"
                                      ? [{ label: "Complete", onSelect: () => void runAction("complete_task", { taskId: task.id }) }]
                                      : [{ label: "Reopen", onSelect: () => void runAction("reopen_task", { taskId: task.id }) }]),
                                    {
                                      label: "Set due date",
                                      onSelect: () => {
                                        const due = window.prompt("Due date (YYYY-MM-DD)", task.dueAt?.slice(0, 10) ?? "");
                                        if (due !== null) void runAction("update_task_due", { taskId: task.id, dueAt: due || null });
                                      },
                                    },
                                    {
                                      label: "Assign (user ID)",
                                      onSelect: () => {
                                        const uid = window.prompt("Assign to user ID (blank to unassign)", task.assignedToId ?? "");
                                        if (uid !== null) void runAction("assign_task", { taskId: task.id, assignedToId: uid || null });
                                      },
                                    },
                                    ...(task.isCustom
                                      ? [{ label: "Delete", onSelect: () => void runAction("delete_task", { taskId: task.id }) }]
                                      : []),
                                  ]}
                                />
                              </TableCell>
                            ) : null}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Activity Log</CardTitle>
                <CardDescription>{overview.activityTotal} entries (tenant-scoped audit trail)</CardDescription>
              </div>
              {overview.canExport ? (
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" asChild>
                  <a href={exportHref} download>
                    <Download className="h-3.5 w-3.5" /> Export
                  </a>
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    className="h-8"
                    value={filters.dateFrom?.slice(0, 10) ?? ""}
                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    className="h-8"
                    value={filters.dateTo?.slice(0, 10) ?? ""}
                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={filters.category ?? "all"}
                    onValueChange={(v) => setFilters((f) => ({ ...f, category: v as EventOperationsFilters["category"] }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_FILTER_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c === "all" ? "All categories" : c.charAt(0).toUpperCase() + c.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Activity type</Label>
                  <Input
                    className="h-8"
                    placeholder="Filter type…"
                    value={filters.activityType ?? ""}
                    onChange={(e) => setFilters((f) => ({ ...f, activityType: e.target.value || undefined }))}
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.activity.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-muted-foreground">
                          No activity recorded for these filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      overview.activity.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="whitespace-nowrap text-xs">{formatTs(row.timestamp)}</TableCell>
                          <TableCell className="text-xs">{row.userName ?? "—"}</TableCell>
                          <TableCell className="text-xs">{row.activityLabel}</TableCell>
                          <TableCell className="max-w-[240px] truncate text-xs">{row.description}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.entityType}
                            {row.entityId ? ` #${row.entityId}` : ""}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.source ?? "—"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedActivity(row)}>
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Completion Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CompletionDonut completed={completed} pending={donutPending} overdue={overdue} percent={percent} />
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Completed</span>
                  </span>
                  <span className="tabular-nums">{completed} ({pct(completed, total)})</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">Pending</span>
                  </span>
                  <span className="tabular-nums">{donutPending} ({pct(donutPending, total)})</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="text-muted-foreground">Overdue</span>
                  </span>
                  <span className="tabular-nums">{overdue} ({pct(overdue, total)})</span>
                </li>
              </ul>
              <p className="border-t pt-3 text-center text-xs text-muted-foreground">
                {completed} of {total} tasks completed
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {overview.activity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <p className="mt-2 text-sm font-medium">No activity yet</p>
                  <p className="text-xs text-muted-foreground">Activity will appear here as tasks are created and updated.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {overview.activity.slice(0, 6).map((row) => (
                    <li key={row.id} className="flex gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{row.activityLabel}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.description}</p>
                        <p className="text-[11px] text-muted-foreground">{formatTs(row.timestamp)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canManage ? (
                <QuickActionRow
                  icon={Plus}
                  tint="bg-emerald-100 text-emerald-600"
                  title="Add task"
                  subtitle="Create a new task"
                  onClick={() => {
                    setShowAddRow(true);
                    scrollToChecklist();
                  }}
                />
              ) : null}
              {overview.canAssignTasks ? (
                <QuickActionRow
                  icon={UserPlus}
                  tint="bg-blue-100 text-blue-600"
                  title="Assign tasks"
                  subtitle="Assign to team members"
                  onClick={() => {
                    scrollToChecklist();
                    toast.info("Use the Actions menu on a task to assign it to a team member.");
                  }}
                />
              ) : null}
              <QuickActionRow
                icon={ListChecks}
                tint="bg-violet-100 text-violet-600"
                title="View all tasks"
                subtitle="See all checklist items"
                onClick={() => {
                  setTaskCategoryFilter("all");
                  setTaskStatusFilter("all");
                  setTaskStaffFilter("all");
                  scrollToChecklist();
                }}
              />
              {overview.canExport ? (
                <QuickActionRow
                  icon={Download}
                  tint="bg-slate-100 text-slate-600"
                  title="Export checklist"
                  subtitle="Download as CSV"
                  href={exportHref}
                />
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <ActivityDrawer
        row={selectedActivity}
        open={selectedActivity != null}
        onOpenChange={(open) => {
          if (!open) setSelectedActivity(null);
        }}
      />
    </div>
  );
}

function QuickActionRow(props: {
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  title: string;
  subtitle: string;
  href?: string;
  onClick?: () => void;
}) {
  const { icon: Icon, tint, title, subtitle, href, onClick } = props;
  const inner = (
    <div className="flex items-center gap-3 rounded-lg border border-border/70 p-2.5 transition-colors hover:border-primary/40 hover:bg-muted/40">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tint)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} download className="block">
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {inner}
    </button>
  );
}
