"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { LineChart } from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LmsCommissionsAnalyticsClient } from "@/components/lms/lms-commissions-analytics-client";

type Summary = {
  overview: {
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    completionRate: number;
    activeStudents: number;
    studentsEngagedLast30Days: number;
    totalRevenue: number;
    revenueRecordCount: number;
    enrollmentsByStatus: { status: string; count: number }[];
  };
  trends: {
    enrollmentsByMonth: { month: string; enrollments: number }[];
    revenueByMonth: { month: string; revenue: number }[];
  };
  coursePerformance: {
    courseId: string;
    title: string;
    status: string;
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    completionRate: number;
    avgProgressPercent: number;
    grossRevenue: number;
  }[];
};

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtMonth(month: string) {
  const [y, m] = month.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export function LmsAnalyticsClient() {
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lms/analytics/summary", { credentials: "include", cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; summary?: Summary; message?: string };
      if (!res.ok || !data.ok || !data.summary) throw new Error(data.message ?? "Failed to load analytics");
      setSummary(data.summary);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const o = summary?.overview;
  const enrollmentChart = (summary?.trends.enrollmentsByMonth ?? []).map((r) => ({
    month: fmtMonth(r.month),
    enrollments: r.enrollments,
  }));
  const revenueChart = (summary?.trends.revenueByMonth ?? []).map((r) => ({
    month: fmtMonth(r.month),
    revenue: r.revenue,
  }));

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="commissions">Commissions & payouts</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6 mt-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard label="Total enrollments" value={String(o?.totalEnrollments ?? 0)} hint="All-time seats" />
          <KpiCard
            label="Active students"
            value={String(o?.activeStudents ?? 0)}
            hint={`${o?.activeEnrollments ?? 0} active enrollments`}
          />
          <KpiCard
            label="Completion rate"
            value={`${o?.completionRate ?? 0}%`}
            hint={`${o?.completedEnrollments ?? 0} completed`}
          />
          <KpiCard
            label="Engaged (30 days)"
            value={String(o?.studentsEngagedLast30Days ?? 0)}
            hint="Distinct learners with lesson activity"
          />
          <KpiCard
            label="Gross revenue"
            value={fmtMoney(o?.totalRevenue ?? 0)}
            hint={`${o?.revenueRecordCount ?? 0} attributed records`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enrollments over time</CardTitle>
              <CardDescription>New enrollments per month (last 12 months)</CardDescription>
            </CardHeader>
            <CardContent>
              {enrollmentChart.length === 0 ? (
                <p className="text-sm text-muted-foreground">No enrollment data yet.</p>
              ) : (
                <LineChart data={enrollmentChart} xAxisKey="month" dataKey="enrollments" color="#6366f1" height={260} showDots />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue over time</CardTitle>
              <CardDescription>Gross course revenue per month</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueChart.length === 0 ? (
                <p className="text-sm text-muted-foreground">No revenue recorded yet.</p>
              ) : (
                <LineChart data={revenueChart} xAxisKey="month" dataKey="revenue" color="#10b981" height={260} showDots />
              )}
            </CardContent>
          </Card>
        </div>

        {(o?.enrollmentsByStatus?.length ?? 0) > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enrollments by status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {o!.enrollmentsByStatus.map((s) => (
                <Badge key={s.status} variant="secondary" className="text-sm px-3 py-1">
                  {s.status}: {s.count}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Course performance</CardTitle>
            <CardDescription>
              Enrollments, completion, average lesson progress, and attributed revenue per course.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Enrollments</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Completion %</TableHead>
                  <TableHead className="text-right">Avg progress</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(summary?.coursePerformance ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      No courses yet. Create a course and enroll learners to see performance metrics.
                    </TableCell>
                  </TableRow>
                ) : (
                  summary!.coursePerformance.map((c) => (
                    <TableRow key={c.courseId}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        <Link
                          href={`/lms/courses?edit=${c.courseId}`}
                          className="hover:text-primary hover:underline underline-offset-2"
                        >
                          {c.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{c.totalEnrollments}</TableCell>
                      <TableCell className="text-right">{c.activeEnrollments}</TableCell>
                      <TableCell className="text-right">{c.completedEnrollments}</TableCell>
                      <TableCell className="text-right">{c.completionRate}%</TableCell>
                      <TableCell className="text-right">{c.avgProgressPercent}%</TableCell>
                      <TableCell className="text-right">{fmtMoney(c.grossRevenue)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="commissions" className="mt-0">
        <LmsCommissionsAnalyticsClient embedded />
      </TabsContent>
    </Tabs>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}
