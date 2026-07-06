"use client";

import * as React from "react";
import Link from "next/link";
import {
  Handshake,
  Loader2,
  Percent,
  Plus,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  Eye,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";

import { AffiliateStatusBadge } from "@/components/affiliate-business/affiliate-status-badge";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { LineChart } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableActionButton } from "@/components/ui/table-action-button";
import { useTranslation } from "@/contexts/translation-context";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";

type Stats = {
  active_partners: number;
  active_programs: number;
  pending_commission_total: number;
  pending_commission_count: number;
  pending_payout_total: number;
  pending_payout_count: number;
  payouts_this_month: number;
  total_clicks: number;
  total_conversions: number;
  conversion_rate: number;
  total_earned: number;
};

type ProgressRow = { month?: string; year?: string; earned: number; paid: number };
type ChartSlice = { name: string; value: number; color: string };
type PartnerPerf = {
  name: string;
  total_clicks: number;
  total_conversions: number;
  conversion_rate: number;
  lifetime_earnings: number;
};
type RecentCommission = {
  id: string;
  order_ref: string;
  amount: number;
  status: string;
  earned_at: string;
  partner_name: string;
  program_name: string;
  referral_code: string;
};
type RecentPartner = {
  id: string;
  name: string;
  email: string | null;
  referral_code: string;
  tier: string;
  status: string;
  total_conversions: number;
  lifetime_earnings: number;
  joined_at: string;
};

const defaultStats: Stats = {
  active_partners: 0,
  active_programs: 0,
  pending_commission_total: 0,
  pending_commission_count: 0,
  pending_payout_total: 0,
  pending_payout_count: 0,
  payouts_this_month: 0,
  total_clicks: 0,
  total_conversions: 0,
  conversion_rate: 0,
  total_earned: 0,
};

function DonutChart({ data, size = 150 }: { data: ChartSlice[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div style={{ width: size, height: size }} className="flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 10}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={size * 0.14}
          />
        </svg>
      </div>
    );
  }
  return (
    <ResponsiveContainer width={size} height={size}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={size * 0.27}
          outerRadius={size * 0.44}
          dataKey="value"
          paddingAngle={2}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function AffiliateBusinessDashboardClient() {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const tr = (s: string) => t(s) || s;
  const currency = settings.currencySymbol ?? "$";

  const [stats, setStats] = React.useState<Stats>(defaultStats);
  const [monthlyProgress, setMonthlyProgress] = React.useState<ProgressRow[]>([]);
  const [yearlyProgress, setYearlyProgress] = React.useState<ProgressRow[]>([]);
  const [progressPeriod, setProgressPeriod] = React.useState<"month" | "year">("month");
  const [commissionStatus, setCommissionStatus] = React.useState<ChartSlice[]>([
    { name: "Pending", value: 0, color: "#f59e0b" },
    { name: "Approved", value: 0, color: "#3b82f6" },
    { name: "Paid", value: 0, color: "#10b981" },
    { name: "Rejected", value: 0, color: "#ef4444" },
  ]);
  const [partnerStatus, setPartnerStatus] = React.useState<ChartSlice[]>([
    { name: "Active", value: 0, color: "#10b981" },
    { name: "Pending", value: 0, color: "#f59e0b" },
    { name: "Suspended", value: 0, color: "#ef4444" },
  ]);
  const [partnerPerformance, setPartnerPerformance] = React.useState<PartnerPerf[]>([]);
  const [recentCommissions, setRecentCommissions] = React.useState<RecentCommission[]>([]);
  const [recentPartners, setRecentPartners] = React.useState<RecentPartner[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const now = new Date();
    const months: ProgressRow[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.toLocaleDateString("en-US", { month: "short" }), earned: 0, paid: 0 });
    }
    const years: ProgressRow[] = [];
    const cy = now.getFullYear();
    for (let i = 5; i >= 0; i--) {
      years.push({ year: String(cy - i), earned: 0, paid: 0 });
    }

    fetch("/api/affiliate-business/dashboard", { credentials: "include" })
      .then(async (r) => {
        const data = (await r.json().catch(() => null)) as Record<string, unknown> | null;
        if (!r.ok || !data?.ok) {
          const msg =
            (typeof data?.message === "string" ? data.message : null) ??
            (r.status === 503
              ? tr("Database models not loaded — run npx prisma generate and restart the dev server.")
              : tr("Failed to load dashboard"));
          toast.error(msg);
          return;
        }
        if (data.stats) setStats(data.stats as Stats);
        setMonthlyProgress(Array.isArray(data.monthlyProgress) ? (data.monthlyProgress as ProgressRow[]) : months);
        setYearlyProgress(Array.isArray(data.yearlyProgress) ? (data.yearlyProgress as ProgressRow[]) : years);
        if (Array.isArray(data.commissionStatus)) setCommissionStatus(data.commissionStatus as ChartSlice[]);
        if (Array.isArray(data.partnerStatus)) setPartnerStatus(data.partnerStatus as ChartSlice[]);
        setPartnerPerformance(
          Array.isArray(data.partnerPerformance) ? (data.partnerPerformance as PartnerPerf[]) : [],
        );
        setRecentCommissions(
          Array.isArray(data.recentCommissions) ? (data.recentCommissions as RecentCommission[]) : [],
        );
        setRecentPartners(Array.isArray(data.recentPartners) ? (data.recentPartners as RecentPartner[]) : []);
      })
      .catch(() => {
        setMonthlyProgress(months);
        setYearlyProgress(years);
      })
      .finally(() => setLoading(false));
  }, [tr]);

  const kpiCards = [
    {
      label: tr("Active Partners"),
      value: stats.active_partners,
      sub:
        stats.pending_commission_count > 0
          ? `${stats.pending_commission_count} ${tr("pending commissions")}`
          : tr("All partners on track"),
      href: "/affiliate-business/partners",
      icon: <UserPlus className="h-8 w-8" />,
      
      
      
    },
    {
      label: tr("Active Programs"),
      value: stats.active_programs,
      sub: `${formatCurrency(stats.total_earned, { currency })} ${tr("total earned")}`,
      href: "/affiliate-business/programs",
      icon: <Handshake className="h-8 w-8" />,
      
      
      
    },
    {
      label: tr("Pending Commissions"),
      value: formatCurrency(stats.pending_commission_total, { currency }),
      sub: `${stats.pending_commission_count} ${tr("awaiting review")}`,
      href: "/affiliate-business/commissions",
      icon: <Percent className="h-8 w-8" />,
      
      
      
    },
    {
      label: tr("Conversion Rate"),
      value: `${stats.conversion_rate}%`,
      sub: `${stats.total_conversions}/${stats.total_clicks} ${tr("conversions")}`,
      href: "/affiliate-business/analytics",
      icon: <TrendingUp className="h-8 w-8" />,
      
      
      
    },
    {
      label: tr("Payouts This Month"),
      value: formatCurrency(stats.payouts_this_month, { currency }),
      sub: `${stats.pending_payout_count} ${tr("pending")} (${formatCurrency(stats.pending_payout_total, { currency })})`,
      href: "/affiliate-business/payouts",
      icon: <Wallet className="h-8 w-8" />,
      
      
      
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        {tr("Loading...")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI row — matches Project Dashboard */}
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

      {/* Earnings vs payouts line chart */}
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              {progressPeriod === "month"
                ? tr("Monthly Affiliate Progress")
                : tr("Yearly Affiliate Progress")}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {tr("Commissions earned vs payouts paid by period")}
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
                  { dataKey: "earned", color: "#3b82f6", name: tr("Commissions Earned") },
                  { dataKey: "paid", color: "#10b981", name: tr("Payouts Paid") },
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
                  { dataKey: "earned", color: "#3b82f6", name: tr("Commissions Earned") },
                  { dataKey: "paid", color: "#10b981", name: tr("Payouts Paid") },
                ]}
                xAxisKey="year"
                showLegend
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Three donut / performance cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{tr("Commission Status")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <DonutChart data={commissionStatus} />
              <div className="w-full space-y-2">
                {commissionStatus.map((item) => (
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
            <CardTitle className="text-base font-semibold">{tr("Partner Status")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <DonutChart data={partnerStatus} />
              <div className="w-full space-y-2">
                {partnerStatus.map((item) => (
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
            <CardTitle className="text-base font-semibold">{tr("Partner Performance")}</CardTitle>
          </CardHeader>
          <CardContent>
            {partnerPerformance.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{tr("No data available")}</p>
            ) : (
              <ul className="space-y-4">
                {partnerPerformance.map((partner, i) => (
                  <li key={i}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate pr-2 font-medium">{partner.name}</span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatCurrency(partner.lifetime_earnings, { currency })}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, partner.conversion_rate)}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-right text-xs text-muted-foreground">
                      {partner.conversion_rate}% {tr("conversion")} · {partner.total_conversions}{" "}
                      {tr("sales")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent commissions — card grid like Recent Company Tasks */}
      {recentCommissions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{tr("Recent Commissions")}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {stats.pending_commission_count} {tr("pending")} ·{" "}
              {formatCurrency(stats.pending_commission_total, { currency })} {tr("to review")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {recentCommissions.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col gap-1.5 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40"
                >
                  <p className="line-clamp-1 font-medium font-mono text-sm">{c.order_ref}</p>
                  <p className="text-xs text-muted-foreground">
                    {tr("Partner")}: <span className="font-medium text-foreground">{c.partner_name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tr("Program")}: {c.program_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(c.earned_at, settings)}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(c.amount, { currency })}
                    </span>
                    <AffiliateStatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partners table — matches Recent Projects table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Users className="h-5 w-5 text-muted-foreground" />
            {tr("Partners")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/affiliate-business/partners">{tr("View all")}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/affiliate-business/partners">
                <Plus className="mr-1 h-4 w-4" />
                {tr("Add Partner")}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentPartners.length === 0 ? (
            <div className="py-10 text-center">
              <UserPlus className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">{tr("No partners yet")}</p>
              <Button size="sm" className="mt-4" asChild>
                <Link href="/affiliate-business/partners">
                  <Plus className="mr-2 h-4 w-4" />
                  {tr("Add Partner")}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{tr("Name")}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{tr("Code")}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{tr("Tier")}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{tr("Status")}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      {tr("Lifetime")}
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">{tr("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPartners.map((p) => (
                    <tr key={p.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.name}</div>
                        {p.email ? <div className="text-xs text-muted-foreground">{p.email}</div> : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{p.referral_code}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{p.tier}</td>
                      <td className="px-4 py-3">
                        <AffiliateStatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(p.lifetime_earnings, { currency })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <TableActionButton
                          label={tr("View")}
                          primaryHref="/affiliate-business/partners"
                          items={[
                            {
                              label: tr("View"),
                              href: "/affiliate-business/partners",
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
