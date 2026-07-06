"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DASHBOARD_STAT_CARD_CLASS } from "@/components/dashboard/dashboard-stat-styles";
import { CalendarDays, CheckCircle2, XCircle, Clock, Link2, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardMonthCalendar } from "@/components/dashboard/dashboard-month-calendar";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────
interface ApptStats {
  totalAppointments: number;
  enabledAppointments: number;
  totalSchedules: number;
  approvedSchedules: number;
  rejectedSchedules: number;
  pendingSchedules: number;
  completedSchedules: number;
}
interface ApptItem {
  id: number;
  name: string;
  type: "Paid" | "Free";
  weekDay: string;
  date: string | null;
  enabled: boolean;
}
interface ScheduleItem {
  id: number;
  name: string | null;
  appointmentName: string | null;
  date: string | null;
  startTime: string | null;
  status: string;
}
interface DashData {
  stats: ApptStats;
  appointments: ApptItem[];
  schedules: ScheduleItem[];
  recentSchedules: ScheduleItem[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  complete:  "#10b981",
  approved:  "#3b82f6",
  pending:   "#f59e0b",
  rejected:  "#ef4444",
};
const STATUS_LABEL: Record<string, string> = {
  complete:  "Complete",
  approved:  "Approved",
  pending:   "Pending",
  rejected:  "Rejected",
};
const DONUT_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

function statusBadge(status: string) {
  const color = STATUS_COLOR[status] ?? "#6b7280";
  return (
    <span className="rounded px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: color }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ── KPI Stat Card ─────────────────────────────────────────────────────────
const STAT_SCHEMES = {
  rose: { card: "", text: "", sub: "text-muted-foreground" },
  green: { card: "", text: "", sub: "text-muted-foreground" },
  red: { card: "", text: "", sub: "text-muted-foreground" },
  yellow: { card: "", text: "", sub: "text-muted-foreground" },
} as const;

function StatCard({ label, value, icon: Icon, scheme, subtitle, href }: {
  label: string; value: number; icon: React.ElementType;
  scheme: keyof typeof STAT_SCHEMES; subtitle?: string;
  href: string;
}) {
  const c = STAT_SCHEMES[scheme];
  return (
    <Link href={href} className="block h-full min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
    <Card className={cn("h-full cursor-pointer transition-shadow hover:shadow-md hover:opacity-95", DASHBOARD_STAT_CARD_CLASS, c.card)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm font-medium ${c.text}`}>{label}</CardTitle>
        <Icon className="h-8 w-8 text-muted-foreground opacity-80" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${c.text}`}>{value}</div>
        {subtitle && <p className={`mt-1 text-xs ${c.sub}`}>{subtitle}</p>}
      </CardContent>
    </Card>
    </Link>
  );
}

const APPT_CARD_ACCENT = [
  "border-l-4 border-l-rose-500",
  "border-l-4 border-l-sky-500",
  "border-l-4 border-l-violet-500",
  "border-l-4 border-l-amber-500",
  "border-l-4 border-l-emerald-500",
  "border-l-4 border-l-blue-500",
] as const;

// ── Appointment tile (matches reference: full-width row + colored left rail) ─
function ApptCard({ appt, accentIndex }: { appt: ApptItem; accentIndex: number }) {
  const accent = APPT_CARD_ACCENT[accentIndex % APPT_CARD_ACCENT.length];
  return (
    <div
      className={`flex h-full min-h-[132px] flex-col rounded-lg border border-border bg-card p-4 shadow-sm ${accent} transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight line-clamp-2">{appt.name}</p>
        <Link2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Type: <span className="font-medium text-foreground">{appt.type}</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Weekday: <span className="font-medium text-foreground">{appt.weekDay || "—"}</span>
      </p>
      {appt.date ? (
        <p className="mt-1 text-xs text-muted-foreground">{appt.date}</p>
      ) : null}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export function AppointmentDashboard() {
  const [data, setData] = React.useState<DashData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const CARDS_PER_PAGE = 4;

  React.useEffect(() => {
    fetch("/api/appointment/dashboard", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">Loading...</div>;

  const s = data?.stats ?? {
    totalAppointments: 0, enabledAppointments: 0, totalSchedules: 0,
    approvedSchedules: 0, rejectedSchedules: 0, pendingSchedules: 0, completedSchedules: 0,
  };
  const appointments = data?.appointments ?? [];
  const schedules = data?.schedules ?? [];
  const recentSchedules = data?.recentSchedules ?? [];

  // Carousel pagination
  const totalPages = Math.ceil(appointments.length / CARDS_PER_PAGE);
  const visible = appointments.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE);

  // Donut data
  const donutData = [
    { name: "Complete",  value: s.completedSchedules, color: "#10b981" },
    { name: "Approved",  value: s.approvedSchedules,  color: "#3b82f6" },
    { name: "Pending",   value: s.pendingSchedules,   color: "#f59e0b" },
    { name: "Rejected",  value: s.rejectedSchedules,  color: "#ef4444" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">

      {/* ── 4 KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Appointments" value={s.totalAppointments} icon={CalendarDays} scheme="rose"   subtitle="All appointments" href="/appointment/appointments" />
        <StatCard label="Total Approved"     value={s.approvedSchedules}  icon={CheckCircle2}  scheme="green"  subtitle="Approved schedules" href="/appointment/schedules" />
        <StatCard label="Total Rejected"     value={s.rejectedSchedules}  icon={XCircle}       scheme="red"    subtitle="Rejected schedules" href="/appointment/schedules" />
        <StatCard label="Total Pending"      value={s.pendingSchedules}   icon={Clock}         scheme="yellow" subtitle="Pending schedules" href="/appointment/schedules" />
      </div>

      {/* ── Show Appointments (equal-width tiles, no empty row gap like reference) ─ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Show Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4 [&>*]:min-w-0">
                {visible.map((a, i) => (
                  <ApptCard key={a.id} appt={a} accentIndex={page * CARDS_PER_PAGE + i} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setPage(i)}
                      className={`h-2.5 w-2.5 rounded-full transition-colors ${i === page ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
                      aria-label={`Page ${i + 1}`}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page === totalPages - 1}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Calendar + Status Distribution ──────────────────────────── */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">

        {/* Calendar — tall column to reduce empty space under the grid */}
        <Card className="flex min-h-[min(85vh,760px)] flex-col lg:col-span-2">
          <CardHeader className="shrink-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              Appointments Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col pb-6">
            <DashboardMonthCalendar
              className="min-h-0 flex-1"
              events={schedules
                .filter((s): s is ScheduleItem & { date: string } => Boolean(s.date))
                .map((s) => ({
                  id: s.id,
                  date: s.date,
                  label: `${(s.appointmentName ?? s.name ?? "Schedule").slice(0, 18)}${(s.appointmentName ?? s.name ?? "").length > 18 ? "…" : ""}`,
                  color: STATUS_COLOR[s.status] ?? "#6b7280",
                  title: `${s.appointmentName ?? ""} — ${s.name ?? ""} (${s.startTime ?? ""})`,
                }))}
            />
          </CardContent>
        </Card>

        {/* Status Distribution + Recent Schedules */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-5 w-5 text-muted-foreground" />
                Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {donutData.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No data</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1.5">
                    {donutData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: d.color }}>
                          {d.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent Schedules */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Recent Schedules
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-72 overflow-y-auto divide-y">
                {recentSchedules.length === 0 ? (
                  <p className="px-6 py-6 text-center text-sm text-muted-foreground">No schedules yet</p>
                ) : (
                  recentSchedules.slice(0, 8).map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{s.appointmentName ?? "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.date ?? "—"}{s.startTime ? ` • ${s.startTime}` : ""}
                        </p>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        {statusBadge(s.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
