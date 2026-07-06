"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/translation-context";
import { DASHBOARD_STAT_CARD_CLASS } from "@/components/dashboard/dashboard-stat-styles";
import { cn } from "@/lib/utils";
import {
  Users,
  Briefcase,
  CalendarDays,
  UserCheck,
  TrendingUp,
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardMonthCalendar } from "@/components/dashboard/dashboard-month-calendar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// ── Types ───────────────────────────────────────────────────────────────────
type Stats = {
  totalCandidates: number;
  activeJobs: number;
  scheduledInterviews: number;
  onboardedCount: number;
  pendingOnboarding?: number;
};
type StatusSlice = { key: string; label: string; count: number; color: string };
type CalEvent = { id: number; title: string; date: string; time: string; color: string; status: string };
type FunnelStage = { label: string; description: string; count: number; percentage: number };

const FUNNEL_ROW_STYLES: Array<{
  row: string;
  iconWrap: string;
  Icon: React.ElementType;
}> = [
  { row: "bg-muted/50 dark:bg-muted/30", iconWrap: "bg-zinc-500", Icon: Users },
  { row: "bg-sky-50 dark:bg-sky-950/25", iconWrap: "bg-sky-500", Icon: Target },
  { row: "bg-orange-50 dark:bg-orange-950/25", iconWrap: "bg-orange-500", Icon: CalendarDays },
  { row: "bg-violet-50 dark:bg-violet-950/25", iconWrap: "bg-violet-500", Icon: Briefcase },
  { row: "bg-emerald-50 dark:bg-emerald-950/25", iconWrap: "bg-emerald-600", Icon: CheckCircle2 },
];

// ── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ data, total }: { data: StatusSlice[]; total: number }) {
  if (data.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No data</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="count" paddingAngle={2}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Legend Row ───────────────────────────────────────────────────────────────
function LegendRow({ item }: { item: StatusSlice }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
        <span className="text-sm text-muted-foreground">{item.label}</span>
      </div>
      <span className="font-semibold">{item.count}</span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function RecruitmentDashboard() {
  const { t: tLang } = useTranslation();
  const t = (s: string) => tLang(s) || s;

  const [stats, setStats] = React.useState<Stats | null>(null);
  const [candidateStatus, setCandidateStatus] = React.useState<StatusSlice[]>([]);
  const [onboardingProgress, setOnboardingProgress] = React.useState<StatusSlice[]>([]);
  const [calendarEvents, setCalendarEvents] = React.useState<CalEvent[]>([]);
  const [hiringFunnel, setHiringFunnel] = React.useState<FunnelStage[]>([]);
  const [careerPortalCompanyId, setCareerPortalCompanyId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/recruitment/dashboard", { credentials: "include", cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        setStats(d.stats ?? null);
        setCandidateStatus(d.candidateStatus ?? []);
        setOnboardingProgress(d.onboardingProgress ?? []);
        setCalendarEvents(d.interviewCalendar ?? []);
        setHiringFunnel(d.hiringFunnel ?? []);
        if (typeof d.careerPortalCompanyId === "string" && d.careerPortalCompanyId) {
          setCareerPortalCompanyId(d.careerPortalCompanyId);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const careerPortalUrl = React.useMemo(() => {
    if (typeof window === "undefined") return "";
    const base = `${window.location.origin}/careers`;
    return careerPortalCompanyId ? `${base}?company=${encodeURIComponent(careerPortalCompanyId)}` : base;
  }, [careerPortalCompanyId]);

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">{t("Loading...")}</div>;

  const s = stats ?? {
    totalCandidates: 0,
    activeJobs: 0,
    scheduledInterviews: 0,
    onboardedCount: 0,
    pendingOnboarding: 0,
  };
  const candidateTotal = candidateStatus.reduce((sum, x) => sum + x.count, 0);
  const onboardingTotal = onboardingProgress.reduce((sum, x) => sum + x.count, 0);
  const pendingOnboarding = s.pendingOnboarding ?? 0;

  async function copyCareerPortalLink() {
    const url =
      careerPortalUrl ||
      (typeof window !== "undefined" ? `${window.location.origin}/careers` : "");
    if (!url) {
      toast.error(t("Could not build career portal link"));
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("execCommand copy failed");
      }
      toast.success(t("Career portal link copied"));
    } catch {
      toast.error(t("Could not copy automatically"), { description: url });
    }
  }

  return (
    <div className="space-y-6">

      {/* ── KPI row (full width) + compact career portal bar ───────── */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          <Link href="/recruitment/candidates" className="block min-w-0">
            <Card className={cn(DASHBOARD_STAT_CARD_CLASS, "relative h-full cursor-pointer overflow-hidden transition-shadow hover:shadow-md")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2 pt-4">
                <CardTitle className="line-clamp-2 text-xs font-medium leading-tight text-muted-foreground sm:text-sm dark:text-muted-foreground">
                  {t("Total Candidates")}
                </CardTitle>
                <Users className="h-6 w-6 shrink-0 text-muted-foreground opacity-80 sm:h-7 sm:w-7 dark:text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="text-xl font-bold tabular-nums text-muted-foreground sm:text-2xl dark:text-muted-foreground">
                  {s.totalCandidates}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground opacity-80 sm:text-xs dark:text-muted-foreground">{t("All candidates")}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/recruitment/job-postings" className="block min-w-0">
            <Card className={cn(DASHBOARD_STAT_CARD_CLASS, "relative h-full cursor-pointer overflow-hidden transition-shadow hover:shadow-md")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2 pt-4">
                <CardTitle className="line-clamp-2 text-xs font-medium leading-tight text-muted-foreground sm:text-sm dark:text-muted-foreground">
                  {t("Active Jobs")}
                </CardTitle>
                <Briefcase className="h-6 w-6 shrink-0 text-muted-foreground opacity-80 sm:h-7 sm:w-7 dark:text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="text-xl font-bold tabular-nums text-muted-foreground sm:text-2xl dark:text-muted-foreground">{s.activeJobs}</div>
                <p className="mt-0.5 text-[11px] text-muted-foreground opacity-80 sm:text-xs dark:text-muted-foreground">{t("Open positions")}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/recruitment/interviews" className="block min-w-0">
            <Card className={cn(DASHBOARD_STAT_CARD_CLASS, "relative h-full cursor-pointer overflow-hidden transition-shadow hover:shadow-md")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2 pt-4">
                <CardTitle className="line-clamp-2 text-xs font-medium leading-tight text-muted-foreground sm:text-sm dark:text-muted-foreground">
                  {t("Interviews")}
                </CardTitle>
                <CalendarDays className="h-6 w-6 shrink-0 text-muted-foreground opacity-80 sm:h-7 sm:w-7 dark:text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="text-xl font-bold tabular-nums text-muted-foreground sm:text-2xl dark:text-muted-foreground">
                  {s.scheduledInterviews}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground opacity-80 sm:text-xs dark:text-muted-foreground">{t("Scheduled this period")}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/recruitment/onboarding" className="block min-w-0">
            <Card className={cn(DASHBOARD_STAT_CARD_CLASS, "relative h-full cursor-pointer overflow-hidden transition-shadow hover:shadow-md")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2 pt-4">
                <CardTitle className="line-clamp-2 text-xs font-medium leading-tight text-muted-foreground sm:text-sm dark:text-muted-foreground">
                  {t("Onboarded")}
                </CardTitle>
                <UserCheck className="h-6 w-6 shrink-0 text-muted-foreground opacity-80 sm:h-7 sm:w-7 dark:text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="text-xl font-bold tabular-nums text-muted-foreground sm:text-2xl dark:text-muted-foreground">
                  {s.onboardedCount}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground opacity-80 sm:text-xs dark:text-muted-foreground">{t("Completed hires")}</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="flex flex-col gap-3 rounded-xl  px-4 py-3 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:py-2.5">
          <div className="min-w-0 pr-2">
            <h2 className="text-base font-semibold leading-tight sm:text-lg">{t("Talent Acquisition Hub")}</h2>
            <p className="mt-0.5 text-xs leading-snug text-white/90 line-clamp-2 sm:line-clamp-1">
              {t("Post jobs, track candidates, and run onboarding from one place.")}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void copyCareerPortalLink()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/35 bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/25 sm:text-sm"
            >
              <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t("Copy Career Portal")}
            </button>
            {careerPortalUrl ? (
              <a
                href={careerPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-white/35 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 sm:text-sm"
              >
                {t("Open portal")}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Calendar + Status Overview ─────────────────────────────── */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        <Card className="flex min-h-[min(85vh,760px)] flex-col lg:col-span-8">
          <CardHeader className="shrink-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              {t("Interview Calendar")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col pb-6">
            <DashboardMonthCalendar
              className="min-h-0 flex-1"
              events={calendarEvents.map((ev) => ({
                id: ev.id,
                date: ev.date,
                label: ev.title.slice(0, 22) + (ev.title.length > 22 ? "…" : ""),
                color: ev.color,
                title: `${ev.title} ${ev.time} (${ev.status})`,
              }))}
            />
          </CardContent>
        </Card>

        {/* Status Overview */}
        <div className="space-y-4 lg:col-span-4">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-4 w-4 text-muted-foreground" />
                {t("Status Overview")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Candidate Status */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {t("Candidate Status")}
                </p>
                {candidateStatus.length > 0 ? (
                  <>
                    <DonutChart data={candidateStatus} total={candidateTotal} />
                    <div className="mt-1 divide-y">
                      {candidateStatus.map((item) => <LegendRow key={item.key} item={item} />)}
                    </div>
                  </>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">{t("No candidate data")}</p>
                )}
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {t("Onboarding Progress")}
                </p>
                {onboardingProgress.length > 0 ? (
                  <>
                    <DonutChart data={onboardingProgress} total={onboardingTotal} />
                    <div className="mt-1 divide-y">
                      {onboardingProgress.map((item, i) => (
                        <div key={i} className={`flex items-center justify-between py-1.5 rounded px-1 ${i === 0 ? "bg-yellow-50 dark:bg-yellow-950/20" : i === 1 ? "bg-blue-50 dark:bg-blue-950/20" : "bg-green-50 dark:bg-green-950/20"}`}>
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-sm">{item.label}</span>
                          </div>
                          <span className="font-semibold text-sm">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">{t("No onboarding data")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Hiring Funnel (DASH-style stages + Attention Required) ─── */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              {t("Hiring Funnel")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hiringFunnel.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("No candidates yet")}</p>
            ) : (
              <div className="relative px-1">
                {/* Vertical connector through stage icons */}
                <div
                  className="pointer-events-none absolute left-10 top-8 bottom-8 z-0 w-px bg-border"
                  aria-hidden
                />
                <div className="relative z-[1] flex flex-col gap-3">
                  {hiringFunnel.map((stage, i) => {
                    const cfg = FUNNEL_ROW_STYLES[i % FUNNEL_ROW_STYLES.length];
                    const Fi = cfg.Icon;
                    const candLabel =
                      stage.count === 1 ? t("Candidate") : t("Candidates");
                    return (
                      <div
                        key={i}
                        className={cn(
                          "relative flex items-center gap-4 rounded-xl border border-border/60 px-4 py-3.5 shadow-sm",
                          cfg.row,
                        )}
                      >
                        <div
                          className={cn(
                            "relative z-[2] flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm",
                            cfg.iconWrap,
                          )}
                        >
                          <Fi className="h-5 w-5 text-white" strokeWidth={2.25} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-tight">{stage.label}</p>
                          <p className="text-sm text-muted-foreground">{stage.description}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums">
                            {stage.count} {candLabel}
                          </p>
                          <p className="text-sm text-muted-foreground tabular-nums">
                            {stage.percentage}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="rounded-xl border  bg-amber-50/90 p-4 dark: dark:bg-amber-950/30">
          <div className="mb-3 flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="font-semibold">{t("Attention Required")}</span>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border  bg-card p-4 shadow-sm dark: sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t("Pending Onboardings")}</p>
                <p className="text-sm text-muted-foreground">
                  {pendingOnboarding === 0
                    ? t("Nothing needs attention right now")
                    : pendingOnboarding === 1
                      ? t("1 item needs attention")
                      : `${pendingOnboarding} ${t("items need attention")}`}
                </p>
              </div>
            </div>
            <Link
              href="/recruitment/onboarding"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border  bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-amber-50 dark: dark:text-muted-foreground dark:hover:bg-amber-950/50"
            >
              {t("Review")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
