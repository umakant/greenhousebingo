"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  FileStack,
  FileText,
  Receipt,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserX,
  Wallet,
} from "lucide-react";
import { useTranslation } from "@/contexts/translation-context";
import { formatCurrency } from "@/lib/format-currency";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { DASHBOARD_STAT_CARD_CLASS } from "@/components/dashboard/dashboard-stat-styles";

type LineRow = {
  id: string;
  expenseDate: string;
  category: string;
  merchant: string | null;
  amount: number;
  currency: string;
  amountUsd: number | null;
  status: string;
};

type Stats = {
  openReports: number;
  receipts: number;
  openExpenses: number;
  approvals: number;
  totalSpendAllTime: number;
  draftReportsCount: number;
  rejectedReportsCount: number;
  totalLineCount: number;
  categoryDistribution: Array<{ name: string; value: number }>;
  settledSpendCurrentMonth: number;
  monthlyTotalSpend: Array<{ month: string; total_expenses: number }>;
  monthlySettledSpend: Array<{ month: string; settled_expenses: number }>;
  recentExpenseLines: LineRow[];
  recentPendingLines: LineRow[];
};

function Avatar({ label }: { label: string }) {
  const name = label.trim() || "?";
  const initials = name
    .split(/\s+/)
    .map((n) => n[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  const colors = [
    "bg-teal-100 text-muted-foreground",
    "bg-blue-100 text-muted-foreground",
    "bg-violet-100 text-muted-foreground",
    "bg-orange-100 text-muted-foreground",
    "bg-rose-100 text-muted-foreground",
  ];
  const color = colors[(name.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${color}`}>
      {initials || "?"}
    </div>
  );
}

function displayAmount(row: LineRow): number {
  return Number(row.amountUsd ?? row.amount ?? 0);
}

export function EmDashboardClient() {
  const { t: tLang } = useTranslation();
  /** Stable wrapper — inline `(s) => tLang(s) || s` changes every render and was breaking the stats effect deps. */
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);
  const { settings } = useAppSettings();
  const formatAmount = (amount: number) => formatCurrency(amount, settings);
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d ?? null, settings);

  const [data, setData] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/expense-management/stats", { credentials: "include", cache: "no-store" });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; data?: Stats };
        if (!res.ok || !json?.ok) {
          throw new Error(json?.message || tLang("Failed to load dashboard.") || "Failed to load dashboard.");
        }
        if (!cancelled) setData(json.data ?? null);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : tLang("Could not load dashboard.") || "Could not load dashboard.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tLang]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">{t("Loading...")}</div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error ?? t("Could not load dashboard.")}
      </div>
    );
  }

  const s = data;
  const categoriesUsed = s.categoryDistribution.length;
  const deptDist = s.categoryDistribution;
  const barColors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#84cc16"];

  const quickActions = [
    { label: t("Operations workspace"), href: "/expense-management/operation-details", icon: Building2 },
    { label: t("Expense reports"), href: "/expense-management/reports", icon: FileStack },
    { label: t("Expense lines"), href: "/expense-management/expenses", icon: Receipt },
    { label: t("Receipts"), href: "/expense-management/receipts", icon: FileText },
    { label: t("Analytics"), href: "/expense-management/analytics", icon: BarChart3 },
    { label: t("New report"), href: "/expense-management/reports", icon: FileText },
    { label: t("Add line"), href: "/expense-management/expenses", icon: TrendingUp },
    { label: t("Review pending"), href: "/expense-management/expenses", icon: Clock },
    { label: t("Summary"), href: "/expense-management/analytics", icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      {/* KPI row 1 — mirrors HRM dashboard rhythm */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link href="/expense-management/expenses">
          <Card
            className={cn(DASHBOARD_STAT_CARD_CLASS, "cursor-pointer hover:opacity-95 transition-shadow hover:shadow-md")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Total expense lines")}</CardTitle>
              <UserCheck className="h-8 w-8 shrink-0 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.totalLineCount}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t("All recorded lines")}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/expense-management/receipts">
          <Card
            className={cn(DASHBOARD_STAT_CARD_CLASS, "cursor-pointer hover:opacity-95 transition-shadow hover:shadow-md")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Receipts on file")}</CardTitle>
              <Receipt className="h-8 w-8 shrink-0 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.receipts}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t("With attachment")}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/expense-management/expenses">
          <Card
            className={cn(DASHBOARD_STAT_CARD_CLASS, "cursor-pointer hover:opacity-95 transition-shadow hover:shadow-md")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Open expense lines")}</CardTitle>
              <UserX className="h-8 w-8 shrink-0 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.openExpenses}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t("Draft or submitted")}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/expense-management/reports">
          <Card
            className={cn(DASHBOARD_STAT_CARD_CLASS, "cursor-pointer hover:opacity-95 transition-shadow hover:shadow-md")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Awaiting approval")}</CardTitle>
              <Calendar className="h-8 w-8 shrink-0 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.approvals}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t("Reports submitted")}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link href="/expense-management/reports">
          <Card
            className={cn(DASHBOARD_STAT_CARD_CLASS, "cursor-pointer hover:opacity-95 transition-shadow hover:shadow-md")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Draft reports")}</CardTitle>
              <Building2 className="h-8 w-8 shrink-0 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.draftReportsCount}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t("Not yet submitted")}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/expense-management/expenses">
          <Card
            className={cn(DASHBOARD_STAT_CARD_CLASS, "cursor-pointer hover:opacity-95 transition-shadow hover:shadow-md")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Categories used")}</CardTitle>
              <Briefcase className="h-8 w-8 shrink-0 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categoriesUsed}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t("Distinct categories")}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/expense-management/analytics">
          <Card
            className={cn(DASHBOARD_STAT_CARD_CLASS, "cursor-pointer hover:opacity-95 transition-shadow hover:shadow-md")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Settled this month")}</CardTitle>
              <TrendingUp className="h-8 w-8 shrink-0 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(s.settledSpendCurrentMonth)}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t("Approved / processed / paid")}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/expense-management/reports">
          <Card
            className={cn(DASHBOARD_STAT_CARD_CLASS, "cursor-pointer hover:opacity-95 transition-shadow hover:shadow-md")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Rejected reports")}</CardTitle>
              <TrendingDown className="h-8 w-8 shrink-0 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.rejectedReportsCount}</div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                {t("Needs attention")}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Category distribution + Quick actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              {t("Spend by category")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {deptDist.length > 0 ? (
                deptDist.map((row, i) => {
                  const maxVal = Math.max(...deptDist.map((d) => d.value), 1);
                  const pct = (row.value / maxVal) * 100;
                  return (
                    <div key={row.name + i} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{row.name}</span>
                        <span className="text-sm font-bold">{row.value}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: barColors[i % barColors.length] }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center py-10 text-muted-foreground">
                  <Briefcase className="mb-2 h-10 w-10 opacity-40" />
                  <p className="text-sm">{t("No categories yet")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              {t("Quick Actions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(({ label, href, icon: Icon }) => (
                <Button key={href + label} className="h-9 w-full justify-start text-xs" variant="outline" asChild>
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

      {/* Pending lines + Recent expenses */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Clock className="h-5 w-5 text-muted-foreground" />
              {t("Awaiting approval")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 divide-y overflow-y-auto">
              {s.recentPendingLines.length > 0 ? (
                s.recentPendingLines.slice(0, 8).map((row) => (
                  <div key={row.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
                    <Avatar label={row.merchant || row.category} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">
                        EXP-{row.id.length > 6 ? row.id.slice(-6) : row.id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(row.merchant || row.category) + " · " + fmtDate(row.expenseDate)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-muted-foreground">{formatAmount(displayAmount(row))}</span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <UserCheck className="mb-2 h-10 w-10 opacity-30" />
                  <p className="text-sm">{t("Nothing pending")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              {t("Recent expenses")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 divide-y overflow-y-auto">
              {s.recentExpenseLines.length > 0 ? (
                s.recentExpenseLines.slice(0, 8).map((row) => (
                  <div key={row.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
                    <Avatar label={row.merchant || row.category} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">
                        EXP-{row.id.length > 6 ? row.id.slice(-6) : row.id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(row.merchant || row.category) + " · " + fmtDate(row.expenseDate)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-muted-foreground">{formatAmount(displayAmount(row))}</span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Receipt className="mb-2 h-10 w-10 opacity-30" />
                  <p className="text-sm">{t("No recent expenses")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total spend summary strip */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("Lifetime spend")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatAmount(s.totalSpendAllTime)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("Open reports (draft + submitted)")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{s.openReports}</span>
            <span className="text-xs text-muted-foreground">{t("reports")}</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
