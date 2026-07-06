"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bug,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Package,
  Plus,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { LineChart } from "@/components/charts";
import {
  COMPLIANCE_DONUT_COLORS,
  DonutWithLegend,
  scoreDonutSlices,
  type DonutSlice,
} from "@/components/compliance/compliance-donut-chart";
import {
  COMPLIANCE_BRAND,
  CompliancePrimaryButton,
  ComplianceRowActions,
  ComplianceSectionShell,
  complianceCardClass,
  complianceTableHeadClass,
  complianceTableRowClass,
} from "@/components/compliance/compliance-ui";
import {
  ComplianceDate,
  complianceRelativeTime,
} from "@/components/compliance/compliance-shared";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { t } from "@/lib/admin-t";
import {
  COMPLIANCE_IMPACT_LEVELS,
  COMPLIANCE_LIKELIHOOD_LEVELS,
} from "@/lib/compliance/compliance-day2";
import {
  QUICK_EXPORT_ITEMS,
  REPORT_CATEGORIES,
  REPORT_TEMPLATES,
  auditStatusBadgeClass,
  frameworkBarColor,
  matrixBg,
} from "@/lib/compliance/compliance-reports-data";
import { matrixCellScore, matrixCellTone } from "@/lib/compliance/compliance-risks";
import { cn } from "@/lib/utils";

type ReportsDashboard = {
  summary: {
    complianceScore: number;
    complianceScoreDelta: { value: string; tone: string };
    auditReadiness: number;
    auditReadinessDelta: { value: string; tone: string };
    controlsPassing: number;
    controlsTotal: number;
    evidenceApproved: number;
    evidenceTotal: number;
    openRisks: number;
    openRisksDelta: { value: string; tone: string };
    criticalVulnerabilities: number;
    criticalVulnerabilitiesDelta: { value: string; tone: string };
  };
  scoreBreakdown: Array<{ label: string; value: number }>;
  frameworks: Array<{ id: number; code: string; name: string; progressPct: number }>;
  scoreTrend: Array<{ month: string; score: number }>;
  evidenceAnalytics: { approved: number; pending: number; rejected: number; expired: number; total: number };
  riskAnalytics: {
    matrix: Record<string, number>;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  audits: Array<{
    id: number;
    name: string;
    framework: string;
    statusLabel: string;
    readiness: number;
    lastUpdated: string | null;
  }>;
  recentReports: Array<{
    id: string;
    name: string;
    generatedBy: string;
    generatedAt: string;
    format: string;
  }>;
  scheduledReports: Array<{
    id: string;
    name: string;
    schedule: string;
    format: string;
    recipients: string[];
    enabled: boolean;
  }>;
};

function categoryIcon(icon: string) {
  if (icon === "shield") return Shield;
  if (icon === "package") return Package;
  if (icon === "chart") return BarChart3;
  if (icon === "alert") return AlertTriangle;
  if (icon === "building") return Building2;
  return Bug;
}

function ownerInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function MiniScoreDonut({ value, color }: { value: number; color: string }) {
  const slices: DonutSlice[] = [
    { name: "Score", value, color },
    { name: "Gap", value: Math.max(0, 100 - value), color: COMPLIANCE_DONUT_COLORS.track },
  ];
  return (
    <DonutWithLegend
      data={slices}
      centerLabel={`${value}%`}
      size={72}
      hideLegend
    />
  );
}

function RiskMatrixCompact({ matrix }: { matrix: Record<string, number> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-1.5 text-left text-muted-foreground">{t("Impact")} ↓</th>
            {COMPLIANCE_LIKELIHOOD_LEVELS.map((l) => (
              <th key={l.value} className="p-1.5 text-center font-medium">
                {l.label.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...COMPLIANCE_IMPACT_LEVELS].reverse().map((impact) => (
            <tr key={impact.value}>
              <td className="p-1.5 font-medium">{impact.label.slice(0, 6)}</td>
              {COMPLIANCE_LIKELIHOOD_LEVELS.map((likelihood) => {
                const count = matrix[`${impact.value}:${likelihood.value}`] ?? 0;
                const tone = matrixCellTone(matrixCellScore(impact.value, likelihood.value));
                return (
                  <td key={likelihood.value} className={cn("p-1.5 text-center", matrixBg(tone))}>
                    {count || "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionLink({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      className="text-xs font-medium text-primary hover:underline"
      onClick={onClick}
    >
      {label} →
    </button>
  );
}

export function ComplianceReportsClient() {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<ReportsDashboard | null>(null);
  const [trendRange, setTrendRange] = React.useState("6m");
  const [scheduled, setScheduled] = React.useState<Record<string, boolean>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/compliance/reports/dashboard", { credentials: "include" });
      const json = (await res.json().catch(() => null)) as ReportsDashboard & { ok?: boolean };
      if (res.ok && json?.ok) {
        setData(json);
        setScheduled(
          Object.fromEntries((json.scheduledReports ?? []).map((s) => [s.id, s.enabled])),
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const generateReport = (reportType: string, format: "pdf" | "xlsx" | "csv" = "pdf") => {
    window.open(`/api/compliance/reports?type=${reportType}&format=${format}`, "_blank");
    toast.success(t("Report generation started"));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {t("Could not load reports dashboard.")}
      </div>
    );
  }

  const s = data.summary;
  const evidenceTotal = data.evidenceAnalytics.total || 1;
  const evidenceDonut: DonutSlice[] = [
    { name: t("Approved"), value: data.evidenceAnalytics.approved, color: COMPLIANCE_DONUT_COLORS.green },
    { name: t("Pending Review"), value: data.evidenceAnalytics.pending, color: COMPLIANCE_DONUT_COLORS.amber },
    { name: t("Rejected"), value: data.evidenceAnalytics.rejected, color: COMPLIANCE_DONUT_COLORS.red },
    { name: t("Expired"), value: data.evidenceAnalytics.expired, color: COMPLIANCE_DONUT_COLORS.gray },
  ].filter((x) => x.value > 0);

  const deltaClass = (tone: string, invert = false) => {
    const good = invert ? tone === "down" : tone === "up";
    return good ? "text-emerald-600" : tone === "neutral" ? "text-muted-foreground" : "text-red-600";
  };

  return (
    <ComplianceSectionShell
      title={t("Compliance Reports")}
      description={t("Generate executive, auditor, security, risk, and compliance reports.")}
      actions={
        <>
          <CompliancePrimaryButton type="button" onClick={() => toast.message(t("Schedule report coming soon."))}>
            <CalendarClock className="mr-1.5 h-4 w-4" />
            {t("Schedule Report")}
          </CompliancePrimaryButton>
          <Button size="sm" variant="outline" onClick={() => toast.message(t("Custom report builder coming soon."))}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("Create Custom Report")}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Top metrics */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Card className={complianceCardClass}>
            <CardContent className="flex items-center gap-3 p-4">
              <MiniScoreDonut value={s.complianceScore} color={COMPLIANCE_DONUT_COLORS.green} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("Overall Compliance Score")}
                </p>
                <p className={cn("text-xs", deltaClass(s.complianceScoreDelta.tone))}>{s.complianceScoreDelta.value}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={complianceCardClass}>
            <CardContent className="flex items-center gap-3 p-4">
              <MiniScoreDonut value={s.auditReadiness} color={COMPLIANCE_DONUT_COLORS.violet} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Audit Readiness")}</p>
                <p className={cn("text-xs", deltaClass(s.auditReadinessDelta.tone))}>{s.auditReadinessDelta.value}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={complianceCardClass}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Controls Passing")}</p>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {s.controlsPassing}
                <span className="text-base font-normal text-muted-foreground"> / {s.controlsTotal}</span>
              </p>
            </CardContent>
          </Card>
          <Card className={complianceCardClass}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Evidence Approved")}</p>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {s.evidenceApproved}
                <span className="text-base font-normal text-muted-foreground"> / {s.evidenceTotal}</span>
              </p>
            </CardContent>
          </Card>
          <Card className={complianceCardClass}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Open Risks")}</p>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-amber-600">{s.openRisks}</p>
              <p className={cn("text-xs", deltaClass(s.openRisksDelta.tone, true))}>{s.openRisksDelta.value}</p>
            </CardContent>
          </Card>
          <Card className={complianceCardClass}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-600" />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("Critical Vulnerabilities")}
                </p>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-red-600">{s.criticalVulnerabilities}</p>
              <p className={cn("text-xs", deltaClass(s.criticalVulnerabilitiesDelta.tone, true))}>
                {s.criticalVulnerabilitiesDelta.value}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Categories + sidebar */}
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("Report Categories")}</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {REPORT_CATEGORIES.map((cat) => {
                const Icon = categoryIcon(cat.icon);
                return (
                  <Card key={cat.key} className={complianceCardClass}>
                    <CardContent className="flex h-full flex-col p-4">
                      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="font-medium">{t(cat.title)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t(cat.description)}</p>
                      <ul className="mt-3 flex-1 space-y-0.5 text-xs text-muted-foreground">
                        {cat.bullets.map((b) => (
                          <li key={b}>• {t(b)}</li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline"
                        onClick={() => generateReport(cat.reportType)}
                      >
                        {t("Generate")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <Card className={complianceCardClass}>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold">{t("Quick Export")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pb-4">
                {QUICK_EXPORT_ITEMS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted/50"
                    onClick={() => generateReport(item.reportType, item.format)}
                  >
                    <span className="flex items-center gap-2">
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                      {t(item.label)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className={complianceCardClass}>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold">{t("Report Templates")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {REPORT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/30"
                    onClick={() => generateReport("framework_readiness", "pdf")}
                  >
                    <span>{tpl.name}</span>
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
                <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => toast.message(t("Template manager coming soon."))}>
                  {t("Manage Templates")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Framework readiness + score trend */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className={complianceCardClass}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">{t("Framework Readiness")}</CardTitle>
              <SectionLink label={t("View all")} onClick={() => generateReport("framework_readiness")} />
            </CardHeader>
            <CardContent className="space-y-3">
              {data.frameworks.slice(0, 6).map((fw) => (
                <div key={fw.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium">{fw.name}</span>
                    <span className="tabular-nums text-muted-foreground">{fw.progressPct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all", frameworkBarColor(fw.progressPct))}
                      style={{ width: `${fw.progressPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className={complianceCardClass}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">{t("Compliance Score Over Time")}</CardTitle>
              <Select value={trendRange} onValueChange={setTrendRange}>
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6m">{t("Last 6 Months")}</SelectItem>
                  <SelectItem value="12m">{t("Last 12 Months")}</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <LineChart
                data={data.scoreTrend}
                xAxisKey="month"
                dataKey="score"
                color={COMPLIANCE_BRAND}
                height={220}
                showDots
                showGrid
              />
            </CardContent>
          </Card>
        </div>

        {/* Evidence + Risk analytics */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className={complianceCardClass}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">{t("Evidence Analytics")}</CardTitle>
              <SectionLink label={t("View all")} onClick={() => generateReport("evidence", "xlsx")} />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <DonutWithLegend
                  data={evidenceDonut.length ? evidenceDonut : [{ name: t("None"), value: 1, color: COMPLIANCE_DONUT_COLORS.gray }]}
                  size={140}
                />
                <div className="flex-1 space-y-2 text-sm">
                  {[
                    { label: t("Approved"), value: data.evidenceAnalytics.approved, color: "text-emerald-600" },
                    { label: t("Pending Review"), value: data.evidenceAnalytics.pending, color: "text-amber-600" },
                    { label: t("Rejected"), value: data.evidenceAnalytics.rejected, color: "text-red-600" },
                    { label: t("Expired"), value: data.evidenceAnalytics.expired, color: "text-muted-foreground" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className={cn("font-medium tabular-nums", row.color)}>
                        {row.value}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({Math.round((row.value / evidenceTotal) * 100)}%)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={complianceCardClass}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">{t("Risk Analytics")}</CardTitle>
              <SectionLink label={t("View all")} onClick={() => generateReport("risk_register", "xlsx")} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {[
                  { label: t("Critical"), value: data.riskAnalytics.critical, tone: "text-red-600" },
                  { label: t("High"), value: data.riskAnalytics.high, tone: "text-orange-600" },
                  { label: t("Medium"), value: data.riskAnalytics.medium, tone: "text-amber-600" },
                  { label: t("Low"), value: data.riskAnalytics.low, tone: "text-emerald-600" },
                ].map((r) => (
                  <div key={r.label} className="rounded-lg border p-2">
                    <p className={cn("text-lg font-bold tabular-nums", r.tone)}>{r.value}</p>
                    <p className="text-muted-foreground">{r.label}</p>
                  </div>
                ))}
              </div>
              <RiskMatrixCompact matrix={data.riskAnalytics.matrix} />
            </CardContent>
          </Card>
        </div>

        {/* Audit readiness + recent reports */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className={cn(complianceCardClass, "overflow-hidden")}>
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
              <CardTitle className="text-sm font-semibold">{t("Audit Readiness")}</CardTitle>
              <SectionLink label={t("View all")} onClick={() => generateReport("audit_package")} />
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={complianceTableHeadClass}>
                      <th className="px-4 py-2.5">{t("Audit")}</th>
                      <th className="px-4 py-2.5">{t("Framework")}</th>
                      <th className="px-4 py-2.5">{t("Status")}</th>
                      <th className="px-4 py-2.5">{t("Readiness")}</th>
                      <th className="px-4 py-2.5">{t("Last Updated")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.audits.slice(0, 5).map((row) => (
                      <tr key={row.id} className={complianceTableRowClass}>
                        <td className="px-4 py-3 font-medium">{row.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.framework}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("border-0 font-medium", auditStatusBadgeClass(row.statusLabel))}>
                            {row.statusLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 min-w-[100px]">
                          <div className="flex items-center gap-2">
                            <Progress value={row.readiness} className="h-1.5 flex-1" />
                            <span className="text-xs tabular-nums">{row.readiness}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.lastUpdated ? complianceRelativeTime(row.lastUpdated) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(complianceCardClass, "overflow-hidden")}>
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
              <CardTitle className="text-sm font-semibold">{t("Recent Generated Reports")}</CardTitle>
              <SectionLink label={t("View all")} onClick={() => toast.message(t("Report history coming soon."))} />
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={complianceTableHeadClass}>
                      <th className="px-4 py-2.5">{t("Report")}</th>
                      <th className="px-4 py-2.5">{t("Generated By")}</th>
                      <th className="px-4 py-2.5">{t("Date")}</th>
                      <th className="px-4 py-2.5">{t("Format")}</th>
                      <th className="w-12 px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentReports.map((row) => (
                      <tr key={row.id} className={complianceTableRowClass}>
                        <td className="px-4 py-3 font-medium">{row.name}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                                {ownerInitials(row.generatedBy)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-muted-foreground">{row.generatedBy}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <ComplianceDate value={row.generatedAt} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-normal">
                            {row.format}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ComplianceRowActions
                            label={t("Download")}
                            primaryIcon={<Download className="h-4 w-4" />}
                            onView={() => generateReport("compliance", "pdf")}
                            items={[]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scheduled + score breakdown */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className={complianceCardClass}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">{t("Scheduled Reports")}</CardTitle>
              <SectionLink label={t("View all")} onClick={() => toast.message(t("Schedule manager coming soon."))} />
            </CardHeader>
            <CardContent className="space-y-3">
              {data.scheduledReports.map((item) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.schedule}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.format} · {item.recipients.length} {t("recipients")}
                      </p>
                    </div>
                    <Switch
                      checked={scheduled[item.id] ?? item.enabled}
                      onCheckedChange={(v) => setScheduled((prev) => ({ ...prev, [item.id]: v }))}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className={complianceCardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t("Compliance Score Breakdown")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {data.scoreBreakdown.map((item) => (
                  <div key={item.label} className="flex flex-col items-center text-center">
                    <DonutWithLegend
                      data={scoreDonutSlices(item.value)}
                      centerLabel={`${item.value}%`}
                      size={88}
                      hideLegend
                    />
                    <p className="mt-2 text-xs font-medium text-muted-foreground">{t(item.label)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ComplianceSectionShell>
  );
}
