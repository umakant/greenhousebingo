"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Ticket, Clock, CheckCircle2, CalendarDays, Timer, FolderOpen,
  Copy, ChevronLeft, ChevronRight, TrendingUp,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";


type DashStats = {
  total: number; open: number; closed: number; in_progress: number;
  on_hold: number; today: number; categories: number; avg_response_hours: number;
  trend: { name: string; tickets: number }[];
  status_distribution: { name: string; value: number; color: string }[];
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function MiniCalendar() {
  const now = new Date();
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth());
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const todayD = now.getDate(), todayM = now.getMonth(), todayY = now.getFullYear();

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold">{MONTH_NAMES[month]} {year}</span>
        <div className="flex gap-1">
          <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}
            className="p-1 rounded hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}
            className="p-1 rounded hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px">
        {DAYS.map(d => <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">{d}</div>)}
        {cells.map((day, i) => (
          <div key={i} className={`text-center py-1.5 text-xs rounded ${
            day === todayD && month === todayM && year === todayY
              ? "bg-primary text-primary-foreground font-bold"
              : day ? "hover:bg-muted cursor-pointer" : ""
          }`}>
            {day ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StDashboard() {
  const [stats, setStats] = React.useState<DashStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/support-ticket/dashboard", { credentials: "include" })
      .then(r => r.json())
      .then(d => setStats(d.data))
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  /** Public ticket creation is managed on the Tickets page (sheet), not a separate /create route */
  const ticketUrl = typeof window !== "undefined"
    ? `${window.location.origin}/support-ticket/tickets`
    : "/support-ticket/tickets";

  function copyLink() {
    navigator.clipboard.writeText(ticketUrl).then(() => toast.success("Link copied!"));
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">{t("Loading dashboard...")}</div>;
  }

  const s = stats ?? { total: 0, open: 0, closed: 0, in_progress: 0, on_hold: 0, today: 0, categories: 0, avg_response_hours: 0, trend: [], status_distribution: [] };
  const resolutionRate = s.total > 0 ? Math.round((s.closed / s.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <DashboardStatCard label={t("Total Tickets")} value={s.total} sub={t("All time")}
          href="/support-ticket/tickets" icon={<Ticket className="h-8 w-8" />} />
        <DashboardStatCard label={t("Open Tickets")} value={s.open} sub={t("Pending resolution")}
          href="/support-ticket/tickets" icon={<Clock className="h-8 w-8" />} />
        <DashboardStatCard label={t("Closed Tickets")} value={s.closed} sub={`${resolutionRate}% resolution rate`}
          href="/support-ticket/tickets" icon={<CheckCircle2 className="h-8 w-8" />} />
        <DashboardStatCard label={t("Today's Tickets")} value={s.today} sub={t("Created today")}
          href="/support-ticket/tickets" icon={<CalendarDays className="h-8 w-8" />} />
        <DashboardStatCard label={t("Avg Response")} value={`${s.avg_response_hours}h`} sub={t("Response time")}
          href="/support-ticket/tickets" icon={<Timer className="h-8 w-8" />} />
        <DashboardStatCard label={t("Categories")} value={s.categories} sub={t("Active categories")}
          href="/support-ticket/system-setup/categories" icon={<FolderOpen className="h-8 w-8" />} />
      </div>

      {/* Support Ticket System Banner */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{t("Support Ticket System")}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("Manage customer inquiries efficiently with our comprehensive ticket system")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="h-4 w-4 mr-1.5" /> {t("Copy Link")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> {t("Ticket Trends - This Year")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={s.trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="tickets" stroke="#6366F1" fill="#6366F1" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("Status Distribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            {s.status_distribution.every(d => d.value === 0) ? (
              <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">
                {t("No ticket data yet")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={s.status_distribution} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={55} outerRadius={90}>
                    {s.status_distribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={10} formatter={(value) => (
                    <span className="text-xs">{value}</span>
                  )} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("Ticket Status Summary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Open", value: s.open, color: "bg-blue-500", badge: "outline" },
              { label: "In Progress", value: s.in_progress, color: "bg-yellow-500", badge: "secondary" },
              { label: "Closed", value: s.closed, color: "bg-green-500", badge: "secondary" },
              { label: "On Hold", value: s.on_hold, color: "bg-red-500", badge: "destructive" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="text-sm">{t(item.label)}</span>
                </div>
                <Badge variant="outline">{item.value}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("Calendar")}</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniCalendar />
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("Quick Actions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Manage Tickets", href: "/support-ticket/tickets" },
              { label: "Knowledge Base", href: "/support-ticket/knowledge-base" },
              { label: "FAQ", href: "/support-ticket/faq" },
              { label: "Contacts", href: "/support-ticket/contact" },
              { label: "System Setup", href: "/support-ticket/system-setup/categories" },
            ].map(link => (
              <Link key={link.href} href={link.href}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted transition-colors text-sm">
                <span>{t(link.label)}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
