"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  DollarSign,
  LayoutGrid,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { DashboardMonthCalendar } from "@/components/dashboard/dashboard-month-calendar";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { DASHBOARD_STAT_CARD_CLASS } from "@/components/dashboard/dashboard-stat-styles";
import { t } from "@/lib/admin-t";

type Stats = {
  total_leads: number;
  total_deals: number;
  total_users: number;
  total_clients: number;
  open_pipeline_value?: number;
};
type DealStageItem = { name: string; deals: number; color: string; value?: number; order?: number };
type CalendarEvent = { id: string; title: string; startDate: string; color?: string; type?: string; leadName?: string };
type Pipeline = { id: string; name: string };
type RecentDeal = {
  id: number;
  name: string;
  created_at: string;
  stage?: { name: string } | null;
};
type RecentLead = { id: number; name: string; subject: string; created_at: string; status?: string };
type LeadStatusCount = { status: string; count: number };
type TimelineDeal = {
  id: number;
  name: string;
  status: string;
  created_at: string;
  amount: number | null;
};


function fmtDate(s: string) {
  try {
    return new Date(s).toISOString().slice(0, 10);
  } catch {
    return s;
  }
}

const TIMELINE_COLORS = ["#a855f7", "#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#6366f1", "#14b8a6", "#f97316"];

function DealTimelineStrip({ deals }: { deals: TimelineDeal[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="min-w-[520px]">
        <div className="mb-3 flex justify-between gap-0.5 border-b border-border/60 pb-1 text-[10px] text-muted-foreground">
          {dayLabels.map((d) => (
            <span key={d} className={cn("w-full text-center", d % 5 === 1 ? "font-medium text-foreground" : "")}>
              {d}
            </span>
          ))}
        </div>
        <div className="space-y-2">
          {deals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("No recent deals to show on the timeline.")}</p>
          ) : (
            deals.slice(0, 8).map((d, idx) => {
              const created = new Date(d.created_at);
              const startDay = created.getMonth() === month ? Math.max(1, created.getDate()) : 1;
              const leftPct = ((startDay - 1) / daysInMonth) * 100;
              const widthPct = Math.min(32, (4 / daysInMonth) * 100);
              const bg = TIMELINE_COLORS[idx % TIMELINE_COLORS.length];
              return (
                <div key={d.id} className="relative flex h-9 items-center">
                  <div className="w-28 shrink-0 truncate pr-2 text-xs font-medium text-foreground" title={d.name}>
                    {d.name}
                  </div>
                  <div className="relative h-7 min-w-0 flex-1 rounded-md bg-muted/40">
                    <div
                      className="absolute top-1/2 h-5 -translate-y-1/2 rounded-md shadow-sm"
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(8, widthPct)}%`,
                        backgroundColor: bg,
                        minWidth: "48px",
                      }}
                      title={`${d.name} · ${fmtDate(d.created_at)}`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function LeadKanbanBuckets({ rows }: { rows: LeadStatusCount[] }) {
  const map = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) m[r.status] = r.count;
    return m;
  }, [rows]);

  const inMotion = (map.new ?? 0) + (map.contacted ?? 0);
  const qualified = map.qualified ?? 0;
  const outcome = (map.converted ?? 0) + (map.lost ?? 0) + (map.unqualified ?? 0);

  const cols = [
    {
      title: t("In motion"),
      subtitle: t("New & contacted"),
      count: inMotion,
    },
    {
      title: t("Qualified"),
      subtitle: t("Sales-ready"),
      count: qualified,
    },
    {
      title: t("Outcome"),
      subtitle: t("Converted & closed"),
      count: outcome,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {cols.map((c) => (
        <div
          key={c.title}
          className="overflow-hidden rounded-xl border bg-card shadow-sm"
        >
          <div className="flex items-baseline justify-between border-b bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground">
            <span>{c.title}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{c.count}</span>
          </div>
          <p className="border-b border-black/5 px-3 py-1.5 text-[11px] text-muted-foreground dark:border-white/10">
            {c.subtitle}
          </p>
          <div className="px-3 py-4 text-center text-3xl font-bold tabular-nums text-foreground">
            {c.count}
          </div>
        </div>
      ))}
    </div>
  );
}

function KpiChip({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone?: "blue" | "violet" | "emerald" | "orange";
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        DASHBOARD_STAT_CARD_CLASS,
        "flex items-center gap-3 rounded-2xl bg-card px-4 py-3 transition-shadow hover:shadow-md hover:opacity-95",
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/80 shadow-inner">
        <Icon className="h-5 w-5 opacity-90" />
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
      </div>
    </Link>
  );
}

export function CrmDashboard() {
  const { settings } = useAppSettings();
  const [data, setData] = React.useState<{
    stats: Stats;
    dealStageChart: DealStageItem[];
    pipelines: Pipeline[];
    calendarEvents: CalendarEvent[];
    recentDeals: RecentDeal[];
    recentLeads: RecentLead[];
    leadsByStatus: LeadStatusCount[];
    timelineDeals: TimelineDeal[];
  } | null>(null);
  const [selectedPipeline, setSelectedPipeline] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (selectedPipeline) params.set("pipeline_id", selectedPipeline);
    fetch(`/api/crm/dashboard?${params}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) =>
        j &&
        setData({
          stats: {
            ...j.stats,
            open_pipeline_value: j.stats?.open_pipeline_value ?? 0,
          },
          dealStageChart: j.dealStageChart ?? [],
          pipelines: j.pipelines ?? [],
          calendarEvents: j.calendarEvents ?? [],
          recentDeals: j.recentDeals ?? [],
          recentLeads: j.recentLeads ?? [],
          leadsByStatus: j.leadsByStatus ?? [],
          timelineDeals: j.timelineDeals ?? [],
        }),
      )
      .finally(() => setLoading(false));
  }, [selectedPipeline]);

  React.useEffect(() => {
    if (data?.pipelines?.length && !selectedPipeline) {
      setSelectedPipeline(data.pipelines[0].id);
    }
  }, [data?.pipelines, selectedPipeline]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Sparkles className="h-8 w-8 animate-pulse text-primary" />
          <p>{t("Loading workspace…")}</p>
        </div>
      </div>
    );
  }

  const s = data?.stats ?? {
    total_leads: 0,
    total_deals: 0,
    total_users: 0,
    total_clients: 0,
    open_pipeline_value: 0,
  };
  const dealStageChart = data?.dealStageChart ?? [];
  const pipelines = data?.pipelines ?? [];
  const calendarEvents = data?.calendarEvents ?? [];
  const recentDeals = data?.recentDeals ?? [];
  const recentLeads = data?.recentLeads ?? [];
  const leadsByStatus = data?.leadsByStatus ?? [];
  const timelineDeals = data?.timelineDeals ?? [];

  const pipelineValue = Number(s.open_pipeline_value ?? 0);
  const pieData = leadsByStatus.map((r, i) => ({
    name: r.status.replace(/_/g, " "),
    value: r.count,
    fill: TIMELINE_COLORS[i % TIMELINE_COLORS.length],
  }));

  return (
    <div className="space-y-8 pb-8">
      {/* Hero row — monday-style: timeline + big number */}
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <Card className="overflow-hidden border-0 shadow-lg shadow-black/5 lg:col-span-2">
          <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <LayoutGrid className="h-5 w-5 text-primary" />
                {t("Deal timeline")}
              </CardTitle>
              <span className="text-xs text-muted-foreground">{t("New deals placed on the calendar month")}</span>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <DealTimelineStrip deals={timelineDeals} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-sm">
          <CardContent className="flex flex-col justify-between gap-6 p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("Open pipeline value")}</p>
                <p className="mt-2 text-4xl font-bold leading-none tracking-tight tabular-nums">
                  {formatCurrency(pipelineValue || 0, settings)}
                </p>
              </div>
              <div className="rounded-2xl bg-muted p-3">
                <DollarSign className="h-7 w-7 text-muted-foreground" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("Sum of amounts on deals marked")} <span className="font-medium text-foreground">{t("open")}</span>.{" "}
              {t("Switch pipeline below to analyze stages.")}
            </p>
            <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span>
                {s.total_deals} {t("deals")} · {s.total_leads} {t("leads")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead pipeline + KPI strip */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight">{t("Lead pipeline")}</h2>
          <p className="text-xs text-muted-foreground">{t("Counts by lead status for your company")}</p>
        </div>
        <LeadKanbanBuckets rows={leadsByStatus} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiChip label={t("Leads")} value={s.total_leads} icon={Target} tone="blue" href="/crm/leads" />
        <KpiChip label={t("Deals")} value={s.total_deals} icon={Zap} tone="violet" href="/crm/deals" />
        <KpiChip label={t("Staff")} value={s.total_users} icon={Users} tone="emerald" href="/settings" />
        <KpiChip label={t("Clients")} value={s.total_clients} icon={Users} tone="orange" href="/settings" />
      </div>

      {/* Calendar + charts row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="overflow-hidden border-0 shadow-md shadow-black/5 xl:col-span-7">
          <CardHeader className="border-b border-border/40 bg-muted/20">
            <CardTitle className="text-base font-semibold">{t("Activity calendar")}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="min-h-[420px]">
              <DashboardMonthCalendar
                events={calendarEvents.map((ev) => ({
                  id: ev.id,
                  date: ev.startDate,
                  label: `${ev.title.slice(0, 18)}${ev.title.length > 18 ? "…" : ""}`,
                  color: ev.color ?? "#3b82f6",
                  title: ev.leadName ? `${ev.title} — ${ev.leadName}` : ev.title,
                }))}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 xl:col-span-5">
          <Card className="overflow-hidden border-0 shadow-md shadow-black/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{t("Leads by status")}</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <div className="mx-auto h-[220px] w-full max-w-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={72}
                        paddingAngle={2}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} stroke="hsl(var(--background))" strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                  {t("No lead data")}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 shadow-md shadow-black/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">{t("Deals by stage")}</CardTitle>
                {pipelines.length > 0 && (
                  <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue placeholder={t("Pipeline")} />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelines.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {dealStageChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dealStageChart} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={70} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.35)" }} />
                    <Bar dataKey="deals" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name={t("Deals")} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">{t("No stage data")}</div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 border-dashed bg-muted/15">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Bell className="h-4 w-4 text-primary" />
                {t("Notifications")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t("When a deal moves stage, you can notify your team — automation coming soon.")}{" "}
              <span className="font-medium text-foreground">{t("+ Add rule")}</span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="border-b border-border/40 bg-muted/15">
            <CardTitle className="text-base font-semibold">{t("Recently created deals")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentDeals.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">{t("No deals yet")}</p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
                {recentDeals.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.stage?.name ?? "—"}</p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fmtDate(d.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="border-b border-border/40 bg-muted/15">
            <CardTitle className="text-base font-semibold">{t("Recently created leads")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentLeads.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">{t("No leads yet")}</p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
                {recentLeads.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{l.subject}</p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fmtDate(l.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
