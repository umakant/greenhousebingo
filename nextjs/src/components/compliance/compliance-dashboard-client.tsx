"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Plus,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/contexts/translation-context";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { ComplianceFrameworkIcon } from "@/components/compliance/compliance-framework-icon";
import {
  COMPLIANCE_BRAND,
  CompliancePageHeader,
  CompliancePrimaryButton,
  complianceCardClass,
} from "@/components/compliance/compliance-ui";
import { complianceRelativeTime } from "@/components/compliance/compliance-shared";
import {
  COMPLIANCE_DONUT_COLORS,
  DonutWithLegend,
  scoreDonutSlices,
  type DonutSlice,
} from "@/components/compliance/compliance-donut-chart";

type Slice = DonutSlice;

type DashboardData = {
  complianceScore: number;
  frameworkProgress: Array<{ id: number; code: string; name: string; progressPct: number }>;
  auditReadiness: {
    score: number;
    ready: boolean;
    nextAudit: {
      id: number;
      name: string;
      auditType: string;
      startDate: string | null;
      endDate: string | null;
      frameworkCode: string | null;
    } | null;
    activeAuditors: number;
    openIssues: number;
    evidenceItems: number;
  };
  evidenceStatus: { approved: number; pending: number; rejected: number; missing: number };
  controlsStatus: { passing: number; needsReview: number; failed: number };
  riskStatus: { critical: number; high: number; medium: number; low: number };
  vulnerabilityStatus: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
  featuredWhatsNext: {
    id: number;
    headline: string;
    subtask: string;
    daysRemaining: number | null;
  } | null;
  complianceAlerts: Array<{ id: number; title: string; body: string | null; severity: string }>;
  auditTimeline: Array<{
    id: number;
    name: string;
    startDate: string | null;
    endDate: string | null;
    daysRemaining: number | null;
    auditType: string;
  }>;
  recentActivity: Array<{ id: number; action: string; actorName: string | null; createdAt: string }>;
  trustCenterStatus: { published: boolean; publicUrl: string | null; lastUpdatedAt: string | null };
  auditorPortalStatus: {
    enabled: boolean;
    activeAuditors: number;
    openRequests: number;
    pendingEvidence: number;
  };
  monitorsList: Array<{
    id: number;
    name: string;
    category: string;
    status: string;
    statusLabel: string;
    lastRunAt: string | null;
  }>;
  launchpadItems: Array<{ id: string; label: string; current: number; target: number; href: string }>;
  summaryStats?: {
    complianceScore: number;
    frameworksActive: number;
    controlsTotal: number;
    evidenceTotal: number;
    openIssues: number;
  };
};

const DONUT_COLORS = COMPLIANCE_DONUT_COLORS;

function fwBarColor(pct: number) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-orange-500";
}

function monitorStatusClass(status: string) {
  if (status === "ok") return "bg-emerald-100 text-emerald-800";
  if (status === "overdue") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-800";
}

function alertIconClass(severity: string) {
  if (severity === "critical" || severity === "error") return "text-red-500";
  if (severity === "warning") return "text-amber-500";
  return "text-muted-foreground";
}

function frameworkLabel(fw: { code: string; name: string }) {
  return fw.name?.trim() || fw.code?.replace(/_/g, " ") || "—";
}

function formatAuditType(t: string) {
  return t.replace(/_/g, " ").replace(/\btype\b/i, "Type").replace(/soc2/i, "SOC 2");
}

export function ComplianceDashboardClient() {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d ?? null, settings);

  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/compliance/dashboard", { credentials: "include", cache: "no-store" });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; data?: DashboardData };
        if (!res.ok || !json?.ok) throw new Error(json?.message || t("Failed to load compliance dashboard."));
        if (!cancelled) setData(json.data ?? null);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : t("Could not load dashboard."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground">{t("Loading...")}</div>;
  }
  if (error || !data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error ?? t("Could not load dashboard.")}
      </div>
    );
  }

  const d = data;
  const nextAudit = d.auditReadiness.nextAudit;

  const evidenceDonut: Slice[] = [
    { name: "Approved", value: d.evidenceStatus.approved, color: DONUT_COLORS.green },
    { name: "Pending", value: d.evidenceStatus.pending, color: DONUT_COLORS.amber },
    { name: "Rejected", value: d.evidenceStatus.rejected, color: DONUT_COLORS.red },
    { name: "Missing", value: d.evidenceStatus.missing, color: DONUT_COLORS.gray },
  ].filter((x) => x.value > 0);

  const controlsDonut: Slice[] = [
    { name: "Passing", value: d.controlsStatus.passing, color: DONUT_COLORS.green },
    { name: "Needs Review", value: d.controlsStatus.needsReview, color: DONUT_COLORS.amber },
    { name: "Failed", value: d.controlsStatus.failed, color: DONUT_COLORS.red },
  ].filter((x) => x.value > 0);

  const risksDonut: Slice[] = [
    { name: "Critical", value: d.riskStatus.critical, color: DONUT_COLORS.red },
    { name: "High", value: d.riskStatus.high, color: DONUT_COLORS.orange },
    { name: "Medium", value: d.riskStatus.medium, color: DONUT_COLORS.amber },
    { name: "Low", value: d.riskStatus.low, color: DONUT_COLORS.green },
  ].filter((x) => x.value > 0);

  const vulnDonut: Slice[] = [
    { name: "Critical", value: d.vulnerabilityStatus.critical, color: DONUT_COLORS.red },
    { name: "High", value: d.vulnerabilityStatus.high, color: DONUT_COLORS.orange },
    { name: "Medium", value: d.vulnerabilityStatus.medium, color: DONUT_COLORS.amber },
    { name: "Low", value: d.vulnerabilityStatus.low, color: DONUT_COLORS.blue },
    { name: "Info", value: d.vulnerabilityStatus.informational, color: DONUT_COLORS.gray },
  ].filter((x) => x.value > 0);

  const primaryTimeline = d.auditTimeline[0];
  const timelineProgress =
    primaryTimeline?.daysRemaining != null
      ? Math.min(100, Math.max(8, 100 - Math.min(primaryTimeline.daysRemaining, 90)))
      : 0;

  const headerActions = (
    <>
      <CompliancePrimaryButton asChild>
        <Link href="/compliance/evidence">
          <Plus className="mr-1.5 h-4 w-4" />
          {t("Add Evidence")}
        </Link>
      </CompliancePrimaryButton>
      <Button size="sm" variant="outline" asChild>
        <Link href="/compliance/audits">
          <Plus className="mr-1.5 h-4 w-4" />
          {t("New Audit")}
        </Link>
      </Button>
      <Button size="sm" variant="outline" asChild>
        <Link href="/compliance/trust-center">
          {t("View Trust Center")}
          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </Button>
      <Button size="sm" variant="outline" asChild>
        <Link href="/compliance/audits">
          <UserCheck className="mr-1.5 h-4 w-4" />
          {t("View As Auditor")}
        </Link>
      </Button>
    </>
  );

  return (
    <div className="space-y-5">
      <CompliancePageHeader
        title={t("Compliance Dashboard")}
        description={t("Monitor compliance readiness, manage controls, collect evidence, and prepare for audits.")}
        actions={headerActions}
      />

      {/* Top row — score, audit ready, what's next */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className={cn(complianceCardClass, "lg:col-span-6")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("Overall Compliance Score")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <DonutWithLegend
                data={scoreDonutSlices(d.complianceScore)}
                centerLabel={`${d.complianceScore}%`}
                size={148}
                hideLegend
              />
              <div className="min-w-0 flex-1 space-y-3">
                {d.frameworkProgress.map((fw) => (
                  <div key={fw.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2 font-medium">
                        <ComplianceFrameworkIcon code={fw.code} size="sm" />
                        {frameworkLabel(fw)}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{fw.progressPct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all", fwBarColor(fw.progressPct))}
                        style={{ width: `${Math.min(100, fw.progressPct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(complianceCardClass, "lg:col-span-3")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold">{t("Audit Ready")}</CardTitle>
              <Badge
                variant={d.auditReadiness.ready ? "default" : "destructive"}
                className="shrink-0 uppercase"
              >
                {d.auditReadiness.ready ? t("Yes") : t("No")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {nextAudit ? (
              <>
                <div>
                  <div className="text-xs text-muted-foreground">{t("Next Audit")}</div>
                  <div className="font-medium">
                    {fmtDate(nextAudit.startDate)} — {formatAuditType(nextAudit.auditType)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t("Audit Window")}</div>
                  <div className="font-medium">
                    {fmtDate(nextAudit.startDate)} – {fmtDate(nextAudit.endDate)}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">{t("No upcoming audits scheduled.")}</p>
            )}
            <ul className="space-y-1.5 border-t pt-3 text-sm">
              <li className="flex justify-between gap-2">
                <span className="text-muted-foreground">{t("Active Auditors")}</span>
                <span className="font-semibold tabular-nums">{d.auditReadiness.activeAuditors}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-muted-foreground">{t("Open Issues")}</span>
                <span className="font-semibold tabular-nums">{d.auditReadiness.openIssues}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-muted-foreground">{t("Evidence Items")}</span>
                <span className="font-semibold tabular-nums">{d.auditReadiness.evidenceItems}</span>
              </li>
            </ul>
            <Link
              href="/compliance/audits"
              className="inline-flex items-center text-sm font-medium hover:underline"
              style={{ color: COMPLIANCE_BRAND }}
            >
              {t("View Audit Details")}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className={cn(complianceCardClass, "border-2 lg:col-span-3")} style={{ borderColor: COMPLIANCE_BRAND }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("What's Next?")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.featuredWhatsNext ? (
              <>
                <div>
                  <div className="text-sm font-semibold">{d.featuredWhatsNext.headline}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{d.featuredWhatsNext.subtask}</div>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">{t("Due")}: </span>
                  <span className="font-semibold">
                    {d.featuredWhatsNext.daysRemaining != null
                      ? `${d.featuredWhatsNext.daysRemaining} ${t("Days")}`
                      : t("Soon")}
                  </span>
                </div>
                <CompliancePrimaryButton className="w-full" asChild>
                  <Link href="/compliance/evidence">
                    {t("Continue")}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </CompliancePrimaryButton>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("No urgent tasks — you're on track.")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status donuts + audit timeline */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { title: t("Evidence Status"), data: evidenceDonut },
          { title: t("Controls Status"), data: controlsDonut },
          { title: t("Risks"), data: risksDonut },
          { title: t("Vulnerabilities"), data: vulnDonut },
        ].map((block) => (
          <Card key={block.title} className={complianceCardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{block.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutWithLegend
                data={block.data.length ? block.data : [{ name: "None", value: 1, color: DONUT_COLORS.gray }]}
              />
            </CardContent>
          </Card>
        ))}

        <Card className={complianceCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t("Audit Timeline")}</CardTitle>
          </CardHeader>
          <CardContent>
            {primaryTimeline ? (
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">{primaryTimeline.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("Starts")} {fmtDate(primaryTimeline.startDate)}
                  </div>
                </div>
                {primaryTimeline.daysRemaining != null ? (
                  <>
                    <Progress
                      value={timelineProgress}
                      className="h-2 bg-muted [&>div]:bg-[#E31B23]"
                    />
                    <div className="text-sm font-semibold" style={{ color: COMPLIANCE_BRAND }}>
                      {primaryTimeline.daysRemaining} {t("Days Remaining")}
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("No audits on timeline.")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom widgets */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className={complianceCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("Monitors")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.monitorsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("No monitors configured.")}</p>
            ) : (
              d.monitorsList.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-2 border-b pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{m.name}</div>
                    <Badge variant="outline" className="mt-1 text-[10px] font-normal capitalize">
                      {m.category.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge className={cn("text-[10px]", monitorStatusClass(m.status))}>{m.statusLabel}</Badge>
                    <div className="mt-1 text-[11px] text-muted-foreground">{complianceRelativeTime(m.lastRunAt)}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className={complianceCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("Compliance Launchpad")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {d.launchpadItems.map((step, i) => {
              const pct = step.target > 0 ? Math.round((step.current / step.target) * 100) : 0;
              return (
                <div key={step.id} className="flex gap-3">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: COMPLIANCE_BRAND }}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <Link href={step.href} className="font-medium hover:underline" style={{ color: COMPLIANCE_BRAND }}>
                        {step.label}
                      </Link>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {step.current}/{step.target}
                      </span>
                    </div>
                    <Progress value={pct} className="mt-1.5 h-1.5 bg-muted [&>div]:bg-[#E31B23]" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className={complianceCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("Trust Center")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("Status")}</span>
              <Badge
                className={cn(
                  d.trustCenterStatus.published
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {d.trustCenterStatus.published ? t("Published") : t("Draft")}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("Last Updated")}</span>
              <span>{d.trustCenterStatus.lastUpdatedAt ? complianceRelativeTime(d.trustCenterStatus.lastUpdatedAt) : "—"}</span>
            </div>
            <Button size="sm" variant="outline" className="w-full" asChild>
              <Link href="/compliance/trust-center">
                {t("View Trust Center")}
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className={complianceCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("Auditor Portal")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg border bg-muted/30 p-2">
                <div className="text-lg font-bold tabular-nums">{d.auditorPortalStatus.activeAuditors}</div>
                <div className="text-[10px] text-muted-foreground">{t("Active Auditors")}</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-2">
                <div className="text-lg font-bold tabular-nums">{d.auditorPortalStatus.openRequests}</div>
                <div className="text-[10px] text-muted-foreground">{t("Open Requests")}</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-2">
                <div className="text-lg font-bold tabular-nums">{d.auditorPortalStatus.pendingEvidence}</div>
                <div className="text-[10px] text-muted-foreground">{t("Pending Evidence")}</div>
              </div>
            </div>
            <Link
              href="/compliance/audits"
              className="inline-flex items-center text-sm font-medium hover:underline"
              style={{ color: COMPLIANCE_BRAND }}
            >
              {t("View Auditor Portal")}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className={complianceCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("Compliance Alerts")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.complianceAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("No active alerts.")}</p>
            ) : (
              d.complianceAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex gap-2 text-sm">
                  <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", alertIconClass(alert.severity))} />
                  <div>
                    <div className="font-medium">{alert.title}</div>
                    {alert.body ? <div className="text-xs text-muted-foreground">{alert.body}</div> : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className={complianceCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("Recent Activity")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("No recent activity.")}</p>
            ) : (
              d.recentActivity.slice(0, 6).map((item) => (
                <div key={item.id} className="flex gap-2 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COMPLIANCE_BRAND }} />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{item.actorName ?? t("System")}</span>{" "}
                    <span className="text-muted-foreground">{item.action}</span>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{complianceRelativeTime(item.createdAt)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
