"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart } from "@/components/charts";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  FolderKanban, Plus, Eye, CheckSquare, Bug, Users, UserCircle, AlertTriangle,
} from "lucide-react";
import { useTranslation } from "@/contexts/translation-context";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { TableActionButton } from "@/components/ui/table-action-button";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { cn } from "@/lib/utils";

type Stats = {
  total_projects: number;
  total_tasks: number;
  total_bugs: number;
  active_bugs: number;
  resolved_bugs: number;
  total_users: number;
  total_clients: number;
  completed_tasks: number;
  completion_rate: number;
  overdue_projects: number;
};
type MonthlyProgress = { month: string; created: number; completed: number };
type YearlyProgress = { year: string; created: number; completed: number };
type ProjectStatusItem = { name: string; value: number; color: string };
type TaskPriorityItem = { name: string; value: number; color: string };
type TeamPerfItem = { name: string; total_tasks: number; completed_tasks: number; completion_rate: number };
type RecentTask = {
  id: number; title: string; priority: string;
  stage_name: string | null; stage_color: string | null; stage_complete: boolean;
  assigned_users: string[]; project_name: string;
};
type ProjectRow = {
  id: number; name: string; status: string | null;
  start_date: string | null; end_date: string | null;
};

const defaultStats: Stats = {
  total_projects: 0, total_tasks: 0, total_bugs: 0, active_bugs: 0, resolved_bugs: 0,
  total_users: 0, total_clients: 0, completed_tasks: 0, completion_rate: 0, overdue_projects: 0,
};

function priorityBadgeClass(priority: string) {
  const p = priority.toLowerCase();
  if (p === "high" || p === "urgent") return "bg-red-100 text-muted-foreground";
  if (p === "low") return "bg-green-100 text-muted-foreground";
  return "bg-orange-100 text-muted-foreground";
}

function stageBadgeStyle(color: string | null, complete: boolean): React.CSSProperties {
  if (complete) return { backgroundColor: "#d1fae5", color: "#065f46" };
  if (!color) return { backgroundColor: "#dbeafe", color: "#1e40af" };
  return { backgroundColor: color + "22", color: color };
}

function DonutChart({ data, size = 140 }: { data: { name: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div style={{ width: size, height: size }} className="flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={size / 2 - 10} fill="none" stroke="#e5e7eb" strokeWidth={size * 0.14} />
        </svg>
      </div>
    );
  }
  return (
    <ResponsiveContainer width={size} height={size}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={size * 0.27} outerRadius={size * 0.44} dataKey="value" paddingAngle={2}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

type KpiCard = {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  href: string;
};

export function ProjectDashboard() {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const tr = (s: string) => t(s) || s;

  const [stats, setStats] = React.useState<Stats>(defaultStats);
  const [monthlyProgress, setMonthlyProgress] = React.useState<MonthlyProgress[]>([]);
  const [yearlyProgress, setYearlyProgress] = React.useState<YearlyProgress[]>([]);
  const [progressPeriod, setProgressPeriod] = React.useState<"month" | "year">("month");
  const [projectStatus, setProjectStatus] = React.useState<ProjectStatusItem[]>([
    { name: "Ongoing", value: 0, color: "#3b82f6" },
    { name: "Finished", value: 0, color: "#10b981" },
    { name: "On Hold", value: 0, color: "#f59e0b" },
  ]);
  const [taskPriority, setTaskPriority] = React.useState<TaskPriorityItem[]>([
    { name: "High", value: 0, color: "#ef4444" },
    { name: "Medium", value: 0, color: "#f59e0b" },
    { name: "Low", value: 0, color: "#10b981" },
  ]);
  const [teamPerformance, setTeamPerformance] = React.useState<TeamPerfItem[]>([]);
  const [recentTasks, setRecentTasks] = React.useState<RecentTask[]>([]);
  const [recentProjects, setRecentProjects] = React.useState<ProjectRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [projectsLoading, setProjectsLoading] = React.useState(true);

  React.useEffect(() => {
    const now = new Date();
    const months: MonthlyProgress[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.toLocaleDateString("en-US", { month: "short" }), created: 0, completed: 0 });
    }
    const years: YearlyProgress[] = [];
    const cy = now.getFullYear();
    for (let i = 5; i >= 0; i--) {
      years.push({ year: String(cy - i), created: 0, completed: 0 });
    }

    fetch("/api/project/dashboard", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        if (data.stats) setStats(data.stats);
        setMonthlyProgress(Array.isArray(data.monthlyProgress) ? data.monthlyProgress : months);
        setYearlyProgress(Array.isArray(data.yearlyProgress) ? data.yearlyProgress : years);
        if (Array.isArray(data.projectStatus)) setProjectStatus(data.projectStatus);
        if (Array.isArray(data.taskPriority)) setTaskPriority(data.taskPriority);
        setTeamPerformance(Array.isArray(data.teamPerformance) ? data.teamPerformance : []);
        setRecentTasks(Array.isArray(data.recentTasks) ? data.recentTasks : []);
      })
      .catch(() => {
        setMonthlyProgress(months);
        setYearlyProgress(years);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetch("/api/project/list?per_page=5&page=1&sort=createdAt&direction=desc", { credentials: "include" })
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((d) => setRecentProjects(Array.isArray(d.data) ? d.data : []))
      .catch(() => setRecentProjects([]))
      .finally(() => setProjectsLoading(false));
  }, []);

  const kpiCards: KpiCard[] = [
    {
      label: tr("Total Projects"),
      value: stats.total_projects,
      sub: stats.overdue_projects > 0 ? `${stats.overdue_projects} ${tr("overdue")}` : tr("All on track"),
      href: "/projects",
      icon: <FolderKanban className="h-8 w-8" />,
      
      
      
    },
    {
      label: tr("Task Completion"),
      value: `${stats.completion_rate}%`,
      sub: `${stats.completed_tasks}/${stats.total_tasks} ${tr("completed")}`,
      href: "/projects",
      icon: <CheckSquare className="h-8 w-8" />,
      
      
      
    },
    {
      label: tr("Active Bugs"),
      value: stats.active_bugs,
      sub: `${stats.resolved_bugs} ${tr("resolved")}`,
      href: "/projects",
      icon: <Bug className="h-8 w-8" />,
      
      
      
    },
    {
      label: tr("Team Members"),
      value: stats.total_users,
      sub: tr("Staff members"),
      href: "/settings",
      icon: <Users className="h-8 w-8" />,
      
      
      
    },
    {
      label: tr("Total Clients"),
      value: stats.total_clients,
      sub: tr("Active clients"),
      href: "/settings",
      icon: <UserCircle className="h-8 w-8" />,
      
      
      
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground">{tr("Loading...")}</div>;
  }

  return (
    <div className="space-y-6">

      {/* ── KPI Stat Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((card) => (
          <DashboardStatCard
            key={card.label}
            label={card.label}
            value={card.value}
            sub={card.sub}
            icon={card.icon}
            href={card.href}

          />
        ))}
      </div>

      {/* ── Company progress: monthly & yearly ───────────────────────── */}
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              {progressPeriod === "month" ? tr("Company Monthly Progress") : tr("Company Yearly Progress")}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{tr("Tasks created vs completed by period")}</p>
          </div>
          <div className="inline-flex shrink-0 rounded-lg border bg-muted/30 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={progressPeriod === "month" ? "default" : "ghost"}
              className="h-8 px-3"
              onClick={() => setProgressPeriod("month")}
            >
              {tr("Monthly")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={progressPeriod === "year" ? "default" : "ghost"}
              className="h-8 px-3"
              onClick={() => setProgressPeriod("year")}
            >
              {tr("Yearly")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {progressPeriod === "month" ? (
              <LineChart
                data={monthlyProgress}
                height={240}
                showTooltip
                showGrid
                lines={[
                  { dataKey: "completed", color: "#10b981", name: tr("Tasks Completed") },
                  { dataKey: "created", color: "#3b82f6", name: tr("Tasks Created") },
                ]}
                xAxisKey="month"
                showLegend
              />
            ) : (
              <LineChart
                data={yearlyProgress}
                height={240}
                showTooltip
                showGrid
                lines={[
                  { dataKey: "completed", color: "#10b981", name: tr("Tasks Completed") },
                  { dataKey: "created", color: "#3b82f6", name: tr("Tasks Created") },
                ]}
                xAxisKey="year"
                showLegend
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── 3 Stats Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Project Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{tr("Project Status")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <DonutChart data={projectStatus} size={150} />
              <div className="w-full space-y-2">
                {projectStatus.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{tr(item.name)}</span>
                    </div>
                    <span className="font-semibold tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Priority */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{tr("Task Priority")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <DonutChart data={taskPriority} size={150} />
              <div className="w-full space-y-2">
                {taskPriority.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{tr(item.name)}</span>
                    </div>
                    <span className="font-semibold tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{tr("Team Performance")}</CardTitle>
          </CardHeader>
          <CardContent>
            {teamPerformance.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{tr("No data available")}</p>
            ) : (
              <ul className="space-y-4">
                {teamPerformance.map((user, i) => (
                  <li key={i}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate pr-2">{user.name}</span>
                      <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {user.completed_tasks}/{user.total_tasks}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${user.completion_rate}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-right text-xs text-muted-foreground">{user.completion_rate}% {tr("completed")}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Company Tasks ─────────────────────────────────────── */}
      {recentTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{tr("Recent Company Tasks")}</CardTitle>
            {stats.total_tasks > 0 && (
              <p className="text-xs text-muted-foreground">
                {stats.completed_tasks} {tr("of")} {stats.total_tasks} {tr("tasks completed across all projects")}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {recentTasks.slice(0, 8).map((task) => (
                <div key={task.id} className="rounded-lg border bg-card p-3 flex flex-col gap-1.5 hover:bg-muted/40 transition-colors">
                  <p className="font-medium text-sm leading-snug line-clamp-2">{task.title}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{tr("Priority")}:</span>
                    <span className={`rounded px-1.5 py-0.5 font-medium text-xs ${priorityBadgeClass(task.priority)}`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1).toLowerCase()}
                    </span>
                  </div>
                  {task.stage_name && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{tr("Stage")}:</span>
                      <span
                        className="rounded px-1.5 py-0.5 font-medium text-xs"
                        style={stageBadgeStyle(task.stage_color, task.stage_complete)}
                      >
                        {task.stage_name}
                      </span>
                    </div>
                  )}
                  {task.assigned_users.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="shrink-0">{tr("Assignee")}:</span>
                      <span className="truncate font-medium text-foreground">{task.assigned_users.join(", ")}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="shrink-0">{tr("Project")}:</span>
                    <span className="truncate">{task.project_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Recent Projects Table ────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-muted-foreground" />
            {tr("Projects")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">{tr("View all")}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/project/new">
                <Plus className="h-4 w-4 mr-1" />
                {tr("Create Project")}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {projectsLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{tr("Loading...")}</p>
          ) : recentProjects.length === 0 ? (
            <div className="py-10 text-center">
              <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">{tr("No projects yet")}</p>
              <Button size="sm" className="mt-4" asChild>
                <Link href="/project/new">
                  <Plus className="h-4 w-4 mr-2" />
                  {tr("Create Project")}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{tr("Name")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{tr("Status")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{tr("Start Date")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{tr("End Date")}</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">{tr("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((proj) => (
                    <tr key={proj.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/project/${proj.id}`} className="font-medium text-primary hover:underline">
                          {proj.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{proj.status ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{proj.start_date ? fmtDateLib(proj.start_date, settings) : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{proj.end_date ? fmtDateLib(proj.end_date, settings) : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <TableActionButton
                          label={tr("View")}
                          primaryHref={`/project/${proj.id}`}
                          items={[
                            { label: tr("View"), href: `/project/${proj.id}`, icon: <Eye className="h-4 w-4" /> },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
