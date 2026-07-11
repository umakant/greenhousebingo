"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Download,
  Loader2,
  ShieldAlert,
  Info,
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

export function EventOperationsTab(props: { eventId: string }) {
  const [overview, setOverview] = React.useState<EventOperationsOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<EventOperationsFilters>({ category: "all" });
  const [selectedActivity, setSelectedActivity] = React.useState<EventActivityRow | null>(null);
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [newTaskCategory, setNewTaskCategory] = React.useState<string>("Staff");

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

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Operational checklist</CardTitle>
              <CardDescription>
                {overview.checklist.completed} of {overview.checklist.total} complete
                {overview.checklist.overdue > 0 ? ` · ${overview.checklist.overdue} overdue` : ""}
              </CardDescription>
            </div>
            <Badge variant="outline">{overview.checklist.percent}%</Badge>
          </div>
          <Progress value={overview.checklist.percent} className="mt-2 h-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <Input
                className="h-8 max-w-xs"
                placeholder="New task title…"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
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
              <Button
                size="sm"
                className="h-8"
                disabled={!newTaskTitle.trim()}
                onClick={() => {
                  void runAction("add_task", { title: newTaskTitle.trim(), category: newTaskCategory }).then((ok) => {
                    if (ok) setNewTaskTitle("");
                  });
                }}
              >
                Add task
              </Button>
            </div>
          ) : null}
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
                {overview.checklist.tasks.map((task) => (
                  <TableRow key={task.id} className={task.isOverdue ? "bg-amber-50/50 dark:bg-amber-950/10" : undefined}>
                    <TableCell>
                      {task.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{task.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{task.category}</TableCell>
                    <TableCell className="text-xs">{task.assignedToName ?? "—"}</TableCell>
                    <TableCell className="text-xs">{task.dueAt ? formatTs(task.dueAt) : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {task.status}
                        {task.isOverdue ? " · overdue" : ""}
                      </Badge>
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
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base">Activity log</CardTitle>
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
