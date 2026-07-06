"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, UserCheck, UserX, Calendar, Building2, Briefcase,
  TrendingUp, TrendingDown, Clock, CreditCard, CalendarDays,
  AlertTriangle, FileText, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { useTranslation } from "@/contexts/translation-context";
import { DashboardMonthCalendar } from "@/components/dashboard/dashboard-month-calendar";
import { DASHBOARD_STAT_SUB_CLASS, DASHBOARD_STAT_TEXT_CLASS, DASHBOARD_STAT_ICON_CLASS, DASHBOARD_STAT_CARD_CLASS } from "@/components/dashboard/dashboard-stat-styles";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { cn } from "@/lib/utils";

type CalEvent = { id: number; title: string; startDate: string; endDate: string; color: string; type: string };
type LeaveApp = { id: number; employee_name: string; leave_type: string; start_date: string; end_date: string; total_days: number; status: string };
type Announcement = { id: number; title: string; description: string; created_at: string };
type OnLeaveEmp = { name: string; leave_type: string; days: number; employee_id?: string; profile?: string };
type MissingEmp = { name: string; department: string; employee_id?: string; profile?: string };

type Stats = {
  total_employees: number; present_today: number; absent_today: number; absent_yesterday?: number;
  on_leave: number; pending_leaves?: number; total_branches: number; total_departments: number;
  total_promotions: number; terminations: number;
  department_distribution?: Array<{ name: string; value: number }>;
  calendar_events?: CalEvent[];
  recent_leave_applications?: LeaveApp[];
  recent_announcements?: Announcement[];
  employees_on_leave_today?: OnLeaveEmp[];
  employees_without_attendance?: MissingEmp[];
};

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").map((n) => n[0]?.toUpperCase()).filter(Boolean).slice(0, 2).join("");
  const colors = ["bg-teal-100 text-muted-foreground","bg-blue-100 text-muted-foreground","bg-violet-100 text-muted-foreground","bg-orange-100 text-muted-foreground","bg-rose-100 text-muted-foreground"];
  const color = colors[(name.charCodeAt(0) ?? 0) % colors.length];
  const sz = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return <div className={`${sz} ${color} flex flex-shrink-0 items-center justify-center rounded-full font-semibold`}>{initials}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "approved") return <Badge className="bg-green-100 text-muted-foreground  hover:bg-green-100 text-xs font-medium">Approved</Badge>;
  if (s === "rejected") return <Badge className="bg-red-100 text-muted-foreground  hover:bg-red-100 text-xs font-medium">Rejected</Badge>;
  return <Badge className="bg-yellow-100 text-muted-foreground  hover:bg-yellow-100 text-xs font-medium">Pending</Badge>;
}

// ── Main Component ──────────────────────────────────────────────────────────
export function HrmDashboard() {
  const { t: tLang } = useTranslation();
  const t = (s: string) => tLang(s) || s;
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/hrm/dashboard", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setStats(data.stats ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">{t("Loading...")}</div>;

  const s = stats ?? {
    total_employees: 0, present_today: 0, absent_today: 0,
    on_leave: 0, total_branches: 0, total_departments: 0,
    total_promotions: 0, terminations: 0,
  };
  const attendanceRate = s.total_employees > 0 ? Math.round((s.present_today / s.total_employees) * 100) : 0;
  const absentDiff = (s.absent_today ?? 0) - (s.absent_yesterday ?? 0);
  const deptDist = s.department_distribution ?? [];
  const onLeaveToday = s.employees_on_leave_today ?? [];
  const missingAttendance = s.employees_without_attendance ?? [];
  const recentLeaves = s.recent_leave_applications ?? [];
  const announcements = s.recent_announcements ?? [];
  const calEvents = s.calendar_events ?? [];

  const barColors = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#f97316","#84cc16"];

  const quickActions = [
    { label: t("Add New Employee"), href: "/hrm/employees", icon: Users },
    { label: t("Mark Attendance"), href: "/hrm/attendances", icon: Clock },
    { label: t("Apply for Leave"), href: "/hrm/leave-applications", icon: Calendar },
    { label: t("Process Payroll"), href: "/hrm/payrolls", icon: CreditCard },
    { label: t("Create Promotion"), href: "/hrm/promotions", icon: TrendingUp },
    { label: t("Create Resignation"), href: "/hrm/resignations", icon: TrendingDown },
    { label: t("Create Holiday"), href: "/hrm/holidays", icon: CalendarDays },
    { label: t("Create Warning"), href: "/hrm/warnings", icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">

      {/* ── KPI Row 1 ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/hrm/employees">
          <Card
            className={cn(
              DASHBOARD_STAT_CARD_CLASS,
              DASHBOARD_STAT_TEXT_CLASS,
              "cursor-pointer transition-shadow hover:shadow-md hover:opacity-95",
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Total Employees")}</CardTitle>
              <Users className={cn("h-8 w-8 shrink-0", DASHBOARD_STAT_ICON_CLASS)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.total_employees}</div>
              <p className={cn("mt-1 text-xs", DASHBOARD_STAT_SUB_CLASS)}>{t("Active employees")}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/hrm/attendances">
          <Card
            className={cn(
              DASHBOARD_STAT_CARD_CLASS,
              DASHBOARD_STAT_TEXT_CLASS,
              "cursor-pointer transition-shadow hover:shadow-md hover:opacity-95",
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Present Today")}</CardTitle>
              <UserCheck className="h-8 w-8 shrink-0 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.present_today}</div>
              <p className={cn("mt-1 text-xs", DASHBOARD_STAT_SUB_CLASS)}>{attendanceRate}% {t("attendance rate")}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/hrm/attendances">
          <Card
            className={cn(
              DASHBOARD_STAT_CARD_CLASS,
              DASHBOARD_STAT_TEXT_CLASS,
              "cursor-pointer transition-shadow hover:shadow-md hover:opacity-95",
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Absent Today")}</CardTitle>
              <UserX className="h-8 w-8 shrink-0 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.absent_today}</div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                {absentDiff > 0 ? <ArrowUpRight className="h-3 w-3" /> : absentDiff < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                {absentDiff > 0 ? "+" : ""}{absentDiff} {t("from yesterday")}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/hrm/leave-applications">
          <Card
            className={cn(
              DASHBOARD_STAT_CARD_CLASS,
              DASHBOARD_STAT_TEXT_CLASS,
              "cursor-pointer transition-shadow hover:shadow-md hover:opacity-95",
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("On Leave")}</CardTitle>
              <Calendar className="h-8 w-8 shrink-0 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.on_leave}</div>
              <p className={cn("mt-1 text-xs", DASHBOARD_STAT_SUB_CLASS)}>{s.pending_leaves ?? 0} {t("pending approvals")}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── KPI Row 2 ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/hrm/setup">
          <Card
            className={cn(
              DASHBOARD_STAT_CARD_CLASS,
              DASHBOARD_STAT_TEXT_CLASS,
              "cursor-pointer transition-shadow hover:shadow-md hover:opacity-95",
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Total Branch")}</CardTitle>
              <Building2 className="h-8 w-8 shrink-0 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.total_branches}</div>
              <p className={cn("mt-1 text-xs", DASHBOARD_STAT_SUB_CLASS)}>{t("Active branches")}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/hrm/setup">
          <Card
            className={cn(
              DASHBOARD_STAT_CARD_CLASS,
              DASHBOARD_STAT_TEXT_CLASS,
              "cursor-pointer transition-shadow hover:shadow-md hover:opacity-95",
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Total Department")}</CardTitle>
              <Briefcase className="h-8 w-8 shrink-0 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.total_departments}</div>
              <p className={cn("mt-1 text-xs", DASHBOARD_STAT_SUB_CLASS)}>{t("Across all branches")}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/hrm/promotions">
          <Card
            className={cn(
              DASHBOARD_STAT_CARD_CLASS,
              DASHBOARD_STAT_TEXT_CLASS,
              "cursor-pointer transition-shadow hover:shadow-md hover:opacity-95",
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Total Promotions")}</CardTitle>
              <TrendingUp className="h-8 w-8 shrink-0 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.total_promotions}</div>
              <p className={cn("mt-1 text-xs", DASHBOARD_STAT_SUB_CLASS)}>{t("This year")}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/hrm/terminations">
          <Card
            className={cn(
              DASHBOARD_STAT_CARD_CLASS,
              DASHBOARD_STAT_TEXT_CLASS,
              "cursor-pointer transition-shadow hover:shadow-md hover:opacity-95",
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Terminations")}</CardTitle>
              <TrendingDown className="h-8 w-8 shrink-0 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.terminations}</div>
              <p className={cn("mt-1 text-xs", DASHBOARD_STAT_SUB_CLASS)}>{t("This month")}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── Dept Distribution + Quick Actions ──────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              {t("Department Distribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {deptDist.length > 0 ? deptDist.map((dept, i) => {
                const maxVal = Math.max(...deptDist.map((d) => d.value), 1);
                const pct = (dept.value / maxVal) * 100;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{dept.name}</span>
                      <span className="text-sm font-bold">{dept.value}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColors[i % barColors.length] }} />
                    </div>
                  </div>
                );
              }) : (
                <div className="flex flex-col items-center py-10 text-muted-foreground">
                  <Briefcase className="mb-2 h-10 w-10 opacity-40" />
                  <p className="text-sm">{t("No departments found")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              {t("Quick Actions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(({ label, href, icon: Icon }) => (
                <Button key={href + label} className="w-full justify-start text-xs h-9" variant="outline" asChild>
                  <Link href={href}>
                    <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                    {label}
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Employees on Leave + Missing Attendance ─────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              {t("Employees on Leave")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto divide-y">
              {onLeaveToday.length > 0 ? onLeaveToday.map((emp, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <Avatar name={emp.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.leave_type} · {emp.days} {emp.days === 1 ? "day" : "days"}</p>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Calendar className="mb-2 h-10 w-10 opacity-30" />
                  <p className="text-sm">{t("No employees on leave today")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <UserX className="h-5 w-5 text-muted-foreground" />
              {t("Missing Attendance Today")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto divide-y">
              {missingAttendance.length > 0 ? missingAttendance.map((emp, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <Avatar name={emp.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.employee_id}</p>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <UserCheck className="mb-2 h-10 w-10 opacity-30" />
                  <p className="text-sm">{t("All employees marked attendance")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Calendar + Right Column ─────────────────────────────────── */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        <Card className="flex min-h-[620px] flex-col lg:col-span-8">
          <CardHeader className="shrink-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              {t("Events & Holidays Calendar")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            <DashboardMonthCalendar
              getEventsForDate={(dateStr) =>
                calEvents
                  .filter((e) => e.startDate <= dateStr && e.endDate >= dateStr)
                  .map((e) => ({
                    id: e.id,
                    label: e.title.slice(0, 20) + (e.title.length > 20 ? "…" : ""),
                    color: e.color || "#10b981",
                    title: e.title,
                  }))
              }
            />
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-4">

          {/* Recent Leave Applications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                {t("Recent Leave Applications")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto divide-y">
                {recentLeaves.length > 0 ? recentLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <Avatar name={leave.employee_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-tight">{leave.employee_name} – {leave.leave_type}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {leave.start_date} – {leave.end_date}
                        {leave.total_days > 0 && <span> ({leave.total_days} {leave.total_days === 1 ? "day" : "days"})</span>}
                      </p>
                    </div>
                    <StatusBadge status={leave.status} />
                  </div>
                )) : (
                  <div className="flex flex-col items-center py-10 text-muted-foreground">
                    <Calendar className="mb-2 h-8 w-8 opacity-30" />
                    <p className="text-sm">{t("No recent leave applications")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText className="h-5 w-5 text-muted-foreground" />
                {t("Announcements")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto divide-y">
                {announcements.length > 0 ? announcements.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="mt-0.5 h-7 w-7 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-tight">{a.title}</p>
                      {a.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>}
                      <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(a.created_at)}</p>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center py-10 text-muted-foreground">
                    <FileText className="mb-2 h-8 w-8 opacity-30" />
                    <p className="text-sm">{t("No active announcements")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
