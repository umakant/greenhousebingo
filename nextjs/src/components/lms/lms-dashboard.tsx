"use client";

import * as React from "react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  BookOpen,
  CheckCircle2,
  DollarSign,
  GraduationCap,
  Plus,
  Users,
  Eye,
} from "lucide-react";

import { LineChart } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableActionButton } from "@/components/ui/table-action-button";
import { useTranslation } from "@/contexts/translation-context";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { cn } from "@/lib/utils";

type Stats = {
  total_courses: number;
  published_courses: number;
  total_enrollments: number;
  active_enrollments: number;
  completed_enrollments: number;
  completion_rate: number;
  active_students: number;
  engaged_students_30d: number;
  total_revenue: number;
  total_instructors: number;
};

type ProgressRow = { month: string; created: number; completed: number };
type YearRow = { year: string; created: number; completed: number };
type DonutItem = { name: string; value: number; color: string };
type CoursePerf = {
  name: string;
  total_enrollments: number;
  completed_enrollments: number;
  completion_rate: number;
};
type RecentCourse = {
  id: string;
  title: string;
  status: string;
  delivery_type: string;
  enrollment_count: number;
  is_public: boolean;
};

const defaultStats: Stats = {
  total_courses: 0,
  published_courses: 0,
  total_enrollments: 0,
  active_enrollments: 0,
  completed_enrollments: 0,
  completion_rate: 0,
  active_students: 0,
  engaged_students_30d: 0,
  total_revenue: 0,
  total_instructors: 0,
};

function DonutChart({ data, size = 140 }: { data: DonutItem[]; size?: number }) {
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
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
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

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
}

export function LmsDashboard() {
  const { t } = useTranslation();
  const tr = (s: string) => t(s) || s;

  const [stats, setStats] = React.useState<Stats>(defaultStats);
  const [monthlyProgress, setMonthlyProgress] = React.useState<ProgressRow[]>([]);
  const [yearlyProgress, setYearlyProgress] = React.useState<YearRow[]>([]);
  const [progressPeriod, setProgressPeriod] = React.useState<"month" | "year">("month");
  const [courseStatus, setCourseStatus] = React.useState<DonutItem[]>([]);
  const [enrollmentStatus, setEnrollmentStatus] = React.useState<DonutItem[]>([]);
  const [coursePerformance, setCoursePerformance] = React.useState<CoursePerf[]>([]);
  const [recentCourses, setRecentCourses] = React.useState<RecentCourse[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const now = new Date();
    const months: ProgressRow[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.toLocaleDateString("en-US", { month: "short" }), created: 0, completed: 0 });
    }
    const years: YearRow[] = [];
    const cy = now.getFullYear();
    for (let i = 5; i >= 0; i--) {
      years.push({ year: String(cy - i), created: 0, completed: 0 });
    }

    fetch("/api/lms/dashboard", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.stats) setStats(data.stats);
        setMonthlyProgress(Array.isArray(data.monthlyProgress) ? data.monthlyProgress : months);
        setYearlyProgress(Array.isArray(data.yearlyProgress) ? data.yearlyProgress : years);
        if (Array.isArray(data.courseStatus)) setCourseStatus(data.courseStatus);
        if (Array.isArray(data.enrollmentStatus)) setEnrollmentStatus(data.enrollmentStatus);
        setCoursePerformance(Array.isArray(data.coursePerformance) ? data.coursePerformance : []);
        setRecentCourses(Array.isArray(data.recentCourses) ? data.recentCourses : []);
      })
      .catch(() => {
        setMonthlyProgress(months);
        setYearlyProgress(years);
      })
      .finally(() => setLoading(false));
  }, []);

  const kpiCards: KpiCard[] = [
    {
      label: tr("Total Courses"),
      value: stats.total_courses,
      sub:
        stats.published_courses > 0
          ? `${stats.published_courses} ${tr("published")}`
          : tr("No published courses"),
      href: "/lms/courses",
      icon: <BookOpen className="h-8 w-8" />,
      
      
      
    },
    {
      label: tr("Completion Rate"),
      value: `${stats.completion_rate}%`,
      sub: `${stats.completed_enrollments}/${stats.active_enrollments + stats.completed_enrollments} ${tr("completed")}`,
      href: "/lms/analytics",
      icon: <CheckCircle2 className="h-8 w-8" />,
      
      
      
    },
    {
      label: tr("Active Students"),
      value: stats.active_students,
      sub: `${stats.engaged_students_30d} ${tr("engaged (30 days)")}`,
      href: "/lms/students",
      icon: <GraduationCap className="h-8 w-8" />,
      
      
      
    },
    {
      label: tr("Total Enrollments"),
      value: stats.total_enrollments,
      sub: `${stats.active_enrollments} ${tr("active")}`,
      href: "/lms/courses",
      icon: <Users className="h-8 w-8" />,
      
      
      
    },
    {
      label: tr("Gross Revenue"),
      value: fmtMoney(stats.total_revenue),
      sub: `${stats.total_instructors} ${tr("instructors")}`,
      href: "/admin/event-platform/subscriptions",
      icon: <DollarSign className="h-8 w-8" />,
      
      
      
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground">{tr("Loading...")}</div>;
  }

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              {progressPeriod === "month" ? tr("Learning Monthly Progress") : tr("Learning Yearly Progress")}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {tr("New enrollments vs course completions by period")}
            </p>
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
                  { dataKey: "completed", color: "#10b981", name: tr("Completions") },
                  { dataKey: "created", color: "#3b82f6", name: tr("New enrollments") },
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
                  { dataKey: "completed", color: "#10b981", name: tr("Completions") },
                  { dataKey: "created", color: "#3b82f6", name: tr("New enrollments") },
                ]}
                xAxisKey="year"
                showLegend
              />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{tr("Course Status")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <DonutChart data={courseStatus} size={150} />
              <div className="w-full space-y-2">
                {courseStatus.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{tr(item.name)}</span>
                    </div>
                    <span className="font-semibold tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{tr("Enrollment Status")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <DonutChart data={enrollmentStatus} size={150} />
              <div className="w-full space-y-2">
                {enrollmentStatus.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{tr(item.name)}</span>
                    </div>
                    <span className="font-semibold tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{tr("Top Courses")}</CardTitle>
          </CardHeader>
          <CardContent>
            {coursePerformance.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{tr("No data available")}</p>
            ) : (
              <ul className="space-y-4">
                {coursePerformance.map((course, i) => (
                  <li key={i}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate pr-2 font-medium">{course.name}</span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {course.completed_enrollments}/{course.total_enrollments}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${course.completion_rate}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-right text-xs text-muted-foreground">
                      {course.completion_rate}% {tr("completed")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            {tr("Courses")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/lms/courses">{tr("View all")}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/lms/courses?action=new">
                <Plus className="mr-1 h-4 w-4" />
                {tr("Create Course")}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentCourses.length === 0 ? (
            <div className="py-10 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">{tr("No courses yet")}</p>
              <Button size="sm" className="mt-4" asChild>
                <Link href="/lms/courses?action=new">
                  <Plus className="mr-2 h-4 w-4" />
                  {tr("Create Course")}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{tr("Title")}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{tr("Status")}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{tr("Type")}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{tr("Enrollments")}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">{tr("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCourses.map((course) => (
                    <tr key={course.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/lms/courses?edit=${course.id}`} className="font-medium text-primary hover:underline">
                          {course.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatStatus(course.status)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatStatus(course.delivery_type)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{course.enrollment_count}</td>
                      <td className="px-4 py-3 text-right">
                        <TableActionButton
                          label={tr("View")}
                          primaryHref={`/lms/courses?edit=${course.id}`}
                          items={[
                            {
                              label: tr("Edit"),
                              href: `/lms/courses?edit=${course.id}`,
                              icon: <Eye className="h-4 w-4" />,
                            },
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
