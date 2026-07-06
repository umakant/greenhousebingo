"use client";

import * as React from "react";
import { useTranslation } from "@/contexts/translation-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, DollarSign, BarChart2, FileBarChart2, CalendarRange } from "lucide-react";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { cn } from "@/lib/utils";

type ProfitLossData = {
  type: "profit-loss";
  from: string;
  to: string;
  total_revenue: number;
  total_expense: number;
  net_profit: number;
  revenue_by_category: { category: string; amount: number }[];
  expense_by_category: { category: string; amount: number }[];
};

type SimpleListData = {
  type: "revenue" | "expense";
  from: string;
  to: string;
  total: number;
  data: { id: number; reference_number: string; customer?: string; vendor?: string; date: string; amount: number; category: string; payment_method: string; status: string }[];
};

type CashFlowData = {
  type: "cash-flow";
  from: string;
  to: string;
  total_inflow: number;
  total_outflow: number;
  net_cash_flow: number;
  inflow_breakdown: { revenue: number; customer_payments: number };
  outflow_breakdown: { expenses: number; vendor_payments: number };
};

type ReportData = ProfitLossData | SimpleListData | CashFlowData | null;

function KpiStatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="relative overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryTable({
  title,
  rows,
  variant,
  formatMoney,
  t,
}: {
  title: string;
  rows: { category: string; amount: number }[];
  variant: "revenue" | "expense";
  formatMoney: (v: unknown) => string;
  t: (s: string) => string;
}) {
  const sorted = [...rows].sort((a, b) => b.amount - a.amount);
  const total = sorted.reduce((s, r) => s + r.amount, 0);
  const barClass = variant === "revenue" ? "[&>div]:bg-emerald-500" : "[&>div]:bg-rose-500";
  const amountClass = variant === "revenue" ? "text-emerald-600" : "text-rose-600";

  return (
    <Card className="flex flex-col overflow-hidden shadow-sm">
      <CardHeader className="border-b bg-muted/30 py-4">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription className="text-xs">
          {sorted.length === 0 ? t("No categories in this period.") : t("Distribution by category for the selected range.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-0">
        {sorted.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{t("No data")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[40%] pl-6">{t("Category")}</TableHead>
                <TableHead className="hidden w-[28%] sm:table-cell">{t("Share")}</TableHead>
                <TableHead className="pr-6 text-right">{t("Amount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r, i) => {
                const pct = total > 0 ? (r.amount / total) * 100 : 0;
                return (
                  <TableRow key={`${r.category}-${i}`}>
                    <TableCell className="pl-6 font-medium">{r.category}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2 pr-2">
                        <Progress value={pct} className={cn("h-2 max-w-[120px]", barClass)} />
                        <span className="text-xs tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className={cn("pr-6 text-right font-semibold tabular-nums", amountClass)}>{formatMoney(r.amount)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={2} className="pl-6 font-semibold">
                  {t("Total")}
                </TableCell>
                <TableCell className={cn("pr-6 text-right text-base font-bold tabular-nums", amountClass)}>{formatMoney(total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function AccountReportsAdmin({ permissions }: { permissions: string[] }) {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const formatMoney = (v: unknown) => formatCurrency(typeof v === "number" ? v : Number(v) || 0, settings);
  const fmtDate = (v: unknown) => fmtDateLib(v as string | null, settings);
  const canView = permissions.includes("*") || permissions.includes("manage-revenues") || permissions.includes("manage-expenses");

  const thisYear = new Date().getFullYear();
  const [reportType, setReportType] = React.useState("profit-loss");
  const [from, setFrom] = React.useState(`${thisYear}-01-01`);
  const [to, setTo] = React.useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = React.useState(false);
  const [report, setReport] = React.useState<ReportData>(null);
  const [error, setError] = React.useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const params = new URLSearchParams({ type: reportType, from, to });
      const res = await fetch(`/api/account/reports?${params}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to generate report"); return; }
      setReport(json);
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!canView) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center text-muted-foreground">{t("You do not have permission to view reports.")}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="space-y-0 border-b bg-muted/25 pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <FileBarChart2 className="h-5 w-5" aria-hidden />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-semibold tracking-tight">{t("Generate Report")}</CardTitle>
                <CardDescription className="max-w-xl text-pretty">
                  {t("Pick a report, set your date range, and generate figures for this period.")}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between xl:gap-8">
            <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(200px,280px)_1fr_1fr] xl:gap-4">
              <div className="grid gap-2 sm:col-span-2 xl:col-span-1">
                <Label htmlFor="report-type" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Report Type")}
                </Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger id="report-type" className="h-11 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profit-loss">{t("Profit & Loss")}</SelectItem>
                    <SelectItem value="revenue">{t("Revenue Report")}</SelectItem>
                    <SelectItem value="expense">{t("Expense Report")}</SelectItem>
                    <SelectItem value="cash-flow">{t("Cash Flow")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="report-from" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("From")}
                </Label>
                <div className="relative">
                  <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    id="report-from"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-11 bg-background pl-10 font-medium tabular-nums"
                  />
                </div>
              </div>
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="report-to" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("To")}
                </Label>
                <div className="relative">
                  <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    id="report-to"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-11 bg-background pl-10 font-medium tabular-nums"
                  />
                </div>
              </div>
            </div>
            <Button
              type="button"
              size="lg"
              className="h-11 shrink-0 px-8 font-semibold shadow-sm xl:self-end"
              onClick={generate}
              disabled={loading}
            >
              {loading ? t("Generating...") : t("Generate")}
            </Button>
          </div>
          {error && (
            <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {report && report.type === "profit-loss" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiStatCard
              label={t("Total Revenue")}
              value={formatMoney(report.total_revenue)}
              icon={TrendingUp}
            />
            <KpiStatCard
              label={t("Total Expenses")}
              value={formatMoney(report.total_expense)}
              icon={TrendingDown}
            />
            <KpiStatCard
              label={t("Net Profit")}
              value={formatMoney(report.net_profit)}
              icon={DollarSign}
            />
          </div>
          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            <CategoryTable
              title={t("Revenue by Category")}
              rows={report.revenue_by_category}
              variant="revenue"
              formatMoney={formatMoney}
              t={t}
            />
            <CategoryTable
              title={t("Expenses by Category")}
              rows={report.expense_by_category}
              variant="expense"
              formatMoney={formatMoney}
              t={t}
            />
          </div>
        </div>
      )}

      {report && report.type === "cash-flow" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiStatCard
              label={t("Total Inflow")}
              value={formatMoney(report.total_inflow)}
              icon={TrendingUp}
            />
            <KpiStatCard
              label={t("Total Outflow")}
              value={formatMoney(report.total_outflow)}
              icon={TrendingDown}
            />
            <KpiStatCard
              label={t("Net Cash Flow")}
              value={formatMoney(report.net_cash_flow)}
              icon={BarChart2}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden shadow-sm">
              <CardHeader className="border-b bg-muted/30 py-4">
                <CardTitle className="text-base font-semibold">{t("Inflow Breakdown")}</CardTitle>
                <CardDescription className="text-xs">{t("Sources of cash entering the business.")}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="pl-6 font-medium">{t("Revenue")}</TableCell>
                      <TableCell className="pr-6 text-right font-semibold tabular-nums text-emerald-600">{formatMoney(report.inflow_breakdown.revenue)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6 font-medium">{t("Customer Payments")}</TableCell>
                      <TableCell className="pr-6 text-right font-semibold tabular-nums text-emerald-600">{formatMoney(report.inflow_breakdown.customer_payments)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="overflow-hidden shadow-sm">
              <CardHeader className="border-b bg-muted/30 py-4">
                <CardTitle className="text-base font-semibold">{t("Outflow Breakdown")}</CardTitle>
                <CardDescription className="text-xs">{t("Cash paid out for operations and vendors.")}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="pl-6 font-medium">{t("Expenses")}</TableCell>
                      <TableCell className="pr-6 text-right font-semibold tabular-nums text-rose-600">{formatMoney(report.outflow_breakdown.expenses)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6 font-medium">{t("Vendor Payments")}</TableCell>
                      <TableCell className="pr-6 text-right font-semibold tabular-nums text-rose-600">{formatMoney(report.outflow_breakdown.vendor_payments)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {report && (report.type === "revenue" || report.type === "expense") && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">{report.type === "revenue" ? t("Revenue Report") : t("Expense Report")}</CardTitle>
                <CardDescription className="mt-1">{t("Line items for the selected period.")}</CardDescription>
              </div>
              <div className="rounded-lg border bg-background px-4 py-2 text-sm shadow-sm">
                <span className="text-muted-foreground">{t("Total")}</span>
                <span className={`ml-2 text-lg font-bold tabular-nums ${report.type === "revenue" ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatMoney(report.total)}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {report.data.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">{t("No records found for this period.")}</p>
            ) : (
              <div className="overflow-x-auto px-1 pb-1 sm:px-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t("Reference")}</th>
                      <th className="px-3 py-2 font-medium">{report.type === "revenue" ? t("Customer") : t("Vendor")}</th>
                      <th className="px-3 py-2 font-medium">{t("Date")}</th>
                      <th className="px-3 py-2 font-medium">{t("Amount")}</th>
                      <th className="px-3 py-2 font-medium">{t("Category")}</th>
                      <th className="px-3 py-2 font-medium">{t("Method")}</th>
                      <th className="px-3 py-2 font-medium">{t("Status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.map((r) => (
                      <tr key={r.id} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-xs">{r.reference_number}</td>
                        <td className="px-3 py-2">{report.type === "revenue" ? (r.customer ?? "—") : (r.vendor ?? "—")}</td>
                        <td className="px-3 py-2">{fmtDate(r.date)}</td>
                        <td className={`px-3 py-2 font-semibold tabular-nums ${report.type === "revenue" ? "text-emerald-600" : "text-rose-600"}`}>{formatMoney(r.amount)}</td>
                        <td className="px-3 py-2">{r.category ?? "—"}</td>
                        <td className="px-3 py-2">{r.payment_method ?? "—"}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "completed" ? "bg-green-100 text-green-800" : r.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
