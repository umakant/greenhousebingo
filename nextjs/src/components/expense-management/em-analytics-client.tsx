"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  FileStack,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LineChart } from "@/components/charts";
import {
  TableColumnVisibilityMenu,
  type TableColumnVisibilityDef,
} from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { HrmProjectsStyleListPage, type HrmViewMode } from "@/components/hrm/hrm-projects-style-list";
import { useTranslation } from "@/contexts/translation-context";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";

type StatsPayload = {
  openReports: number;
  receipts: number;
  openExpenses: number;
  approvals: number;
  totalSpendAllTime: number;
  settledSpendCurrentMonth: number;
  totalLineCount: number;
  categoryDistribution: Array<{ name: string; value: number }>;
  monthlyActivity: Array<{
    month: string;
    month_key?: string;
    month_label?: string;
    total: number;
    pending?: number;
  }>;
  monthlySettledSpend: Array<{
    month: string;
    month_key?: string;
    month_label?: string;
    settled_expenses: number;
  }>;
};

type MonthRow = {
  monthKey: string;
  monthLabel: string;
  totalSpend: number;
  settledSpend: number;
  pendingSpend: number;
};

type ColId = "month" | "total" | "settled" | "pending" | "rate";
type SortField = "monthKey" | "totalSpend" | "settledSpend" | "pendingSpend";

const DEFAULT_COLS: Record<ColId, boolean> = {
  month: true,
  total: true,
  settled: true,
  pending: true,
  rate: true,
};

const CATEGORY_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#84cc16"];

function buildMonthRows(data: StatsPayload): MonthRow[] {
  const settledByKey = Object.fromEntries(
    (data.monthlySettledSpend ?? []).map((x) => [
      x.month_key ?? x.month,
      x.settled_expenses,
    ]),
  );
  return (data.monthlyActivity ?? []).map((m) => {
    const key = m.month_key ?? m.month;
    return {
      monthKey: key,
      monthLabel: m.month_label ?? m.month,
      totalSpend: m.total,
      settledSpend: Number(settledByKey[key] ?? 0),
      pendingSpend: Number(m.pending ?? 0),
    };
  });
}

function settlementRate(total: number, settled: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((settled / total) * 100));
}

export function EmAnalyticsClient() {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);
  const { settings } = useAppSettings();
  const fmtMoney = (n: number) => formatCurrency(n, settings);

  const [stats, setStats] = React.useState<StatsPayload | null>(null);
  const [tableRows, setTableRows] = React.useState<MonthRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [viewMode, setViewMode] = React.useState<HrmViewMode>("list");
  const [sortField, setSortField] = React.useState<SortField>("monthKey");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const colKey = "pf-em-analytics-monthly-cols-v2";
  const { columnVisible, setVisibility, resetVisibility } = useTableColumnVisibility<ColId>(colKey, DEFAULT_COLS);
  const columnDefs = React.useMemo<TableColumnVisibilityDef<ColId>[]>(
    () => [
      { id: "month", label: t("Month") },
      { id: "total", label: t("Total spend") },
      { id: "settled", label: t("Settled spend") },
      { id: "pending", label: t("Pending spend") },
      { id: "rate", label: t("Settlement rate") },
    ],
    [t],
  );

  const loadStats = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/expense-management/stats", { credentials: "include", cache: "no-store" });
      const j = (await res.json()) as { ok?: boolean; message?: string; data?: StatsPayload };
      if (!res.ok || !j?.ok || !j.data) {
        throw new Error(j?.message ?? t("Failed to load analytics."));
      }
      setStats(j.data);
      setTableRows(buildMonthRows(j.data));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("Failed to load analytics."));
      setStats(null);
      setTableRows([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const chartData = React.useMemo(() => {
    return tableRows.map((r) => ({
      month: r.monthLabel,
      total: r.totalSpend,
      settled: r.settledSpend,
      pending: r.pendingSpend,
    }));
  }, [tableRows]);

  const kpis = React.useMemo(() => {
    if (!stats) return null;
    const total6 = tableRows.reduce((s, r) => s + r.totalSpend, 0);
    const settled6 = tableRows.reduce((s, r) => s + r.settledSpend, 0);
    const pending6 = tableRows.reduce((s, r) => s + r.pendingSpend, 0);
    const topCat = [...(stats.categoryDistribution ?? [])].sort((a, b) => b.value - a.value)[0];
    return {
      total6,
      settled6,
      pending6,
      rate6: settlementRate(total6, settled6),
      allTime: stats.totalSpendAllTime,
      pendingApprovals: stats.approvals,
      openLines: stats.openExpenses,
      topCategory: topCat?.name ?? "—",
      topCategoryCount: topCat?.value ?? 0,
    };
  }, [stats, tableRows]);

  const categoryChart = React.useMemo(() => {
    const rows = [...(stats?.categoryDistribution ?? [])]
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    return rows.map((r, i) => ({
      name: r.name,
      count: r.value,
      fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
  }, [stats]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tableRows;
    return tableRows.filter(
      (r) => r.monthLabel.toLowerCase().includes(q) || r.monthKey.toLowerCase().includes(q),
    );
  }, [tableRows, search]);

  const sorted = React.useMemo(() => {
    const out = [...filtered];
    out.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "monthKey":
          cmp = a.monthKey.localeCompare(b.monthKey);
          break;
        case "totalSpend":
          cmp = a.totalSpend - b.totalSpend;
          break;
        case "settledSpend":
          cmp = a.settledSpend - b.settledSpend;
          break;
        case "pendingSpend":
          cmp = a.pendingSpend - b.pendingSpend;
          break;
        default:
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [filtered, sortField, sortDir]);

  const total = sorted.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage) || 1);
  const pageSafe = Math.min(page, lastPage);
  const from = total === 0 ? 0 : (pageSafe - 1) * perPage + 1;
  const to = Math.min(total, pageSafe * perPage);
  const pageItems = sorted.slice((pageSafe - 1) * perPage, pageSafe * perPage);

  const periodTotals = React.useMemo(
    () => ({
      total: sorted.reduce((s, r) => s + r.totalSpend, 0),
      settled: sorted.reduce((s, r) => s + r.settledSpend, 0),
      pending: sorted.reduce((s, r) => s + r.pendingSpend, 0),
    }),
    [sorted],
  );

  React.useEffect(() => {
    if (page > lastPage) setPage(lastPage);
  }, [page, lastPage]);

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir(field === "monthKey" ? "desc" : "desc");
    }
  }

  function sortChevron(field: SortField) {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 inline h-3.5 w-3.5" aria-hidden />
    ) : (
      <ChevronDown className="ml-1 inline h-3.5 w-3.5" aria-hidden />
    );
  }

  const visibleDataCols =
    (columnVisible("month") ? 1 : 0) +
    (columnVisible("total") ? 1 : 0) +
    (columnVisible("settled") ? 1 : 0) +
    (columnVisible("pending") ? 1 : 0) +
    (columnVisible("rate") ? 1 : 0);
  const colSpan = visibleDataCols;

  if (error && !stats) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
        <Button type="button" variant="outline" size="sm" className="ml-3" onClick={() => void loadStats()}>
          {t("Retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground max-w-3xl">
        {t("Rolling six-month view of expense lines. Totals include all statuses; settled reflects approved, paid, or processed lines.")}
      </p>

      {kpis ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Spend (6 months)")}</CardTitle>
              <Wallet className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{fmtMoney(kpis.total6)}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("All time")}: {fmtMoney(kpis.allTime)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Settled (6 months)")}</CardTitle>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{fmtMoney(kpis.settled6)}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("Settlement rate")}: {kpis.rate6}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Pending pipeline")}</CardTitle>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{fmtMoney(kpis.pending6)}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                <Link href="/expense-management/reports" className="text-primary hover:underline">
                  {kpis.pendingApprovals} {t("reports awaiting approval")}
                </Link>
                {" · "}
                {kpis.openLines} {t("open lines")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("Top category")}</CardTitle>
              <Receipt className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="truncate text-lg font-bold">{kpis.topCategory}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {kpis.topCategoryCount} {t("lines")} · {stats?.totalLineCount ?? 0} {t("total lines")}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              {t("Spend trend")}
            </CardTitle>
            <CardDescription>{t("Total, settled, and pending amounts by month")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                {t("Loading...")}
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                {t("No expense lines in the last six months.")}
              </div>
            ) : (
              <LineChart
                data={chartData}
                height={320}
                showTooltip
                showGrid
                showDots
                xAxisKey="month"
                showLegend
                lines={[
                  { dataKey: "total", color: "#0ea5e9", name: t("Total spend") },
                  { dataKey: "settled", color: "#10b981", name: t("Settled spend") },
                  { dataKey: "pending", color: "#f59e0b", name: t("Pending spend") },
                ]}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              {t("By category")}
            </CardTitle>
            <CardDescription>{t("Line count per category")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                {t("Loading...")}
              </div>
            ) : categoryChart.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                {t("No categories yet.")}
              </div>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChart} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/60" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={88}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                      formatter={(val: unknown) => [Number(val), t("Lines")]}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {categoryChart.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <FileStack className="h-5 w-5 text-muted-foreground" />
            {t("Monthly breakdown")}
          </CardTitle>
          <CardDescription>{t("Sorted by calendar month — newest first by default")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <HrmProjectsStyleListPage
            searchPlaceholder={t("Search month...")}
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSearchSubmit={() => {
              setSearch(searchInput.trim());
              setPage(1);
            }}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            perPage={perPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
            columnsMenu={
              <TableColumnVisibilityMenu
                columns={columnDefs}
                columnVisible={columnVisible}
                setVisibility={setVisibility}
                onReset={resetVisibility}
              />
            }
            onRefresh={() => void loadStats()}
            refreshing={loading}
            page={pageSafe}
            lastPage={lastPage}
            total={total}
            from={from}
            to={to}
            onPageChange={(p) => setPage(p)}
          >
            {viewMode === "list" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {columnVisible("month") ? (
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          <button type="button" className="inline-flex items-center" onClick={() => handleSort("monthKey")}>
                            {t("Month")}
                            {sortChevron("monthKey")}
                          </button>
                        </th>
                      ) : null}
                      {columnVisible("total") ? (
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          <button
                            type="button"
                            className="inline-flex w-full items-center justify-end"
                            onClick={() => handleSort("totalSpend")}
                          >
                            {t("Total spend")}
                            {sortChevron("totalSpend")}
                          </button>
                        </th>
                      ) : null}
                      {columnVisible("settled") ? (
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          <button
                            type="button"
                            className="inline-flex w-full items-center justify-end"
                            onClick={() => handleSort("settledSpend")}
                          >
                            {t("Settled spend")}
                            {sortChevron("settledSpend")}
                          </button>
                        </th>
                      ) : null}
                      {columnVisible("pending") ? (
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          <button
                            type="button"
                            className="inline-flex w-full items-center justify-end"
                            onClick={() => handleSort("pendingSpend")}
                          >
                            {t("Pending spend")}
                            {sortChevron("pendingSpend")}
                          </button>
                        </th>
                      ) : null}
                      {columnVisible("rate") ? (
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[140px]">
                          {t("Settlement rate")}
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={Math.max(colSpan, 1)} className="px-4 py-10 text-center text-muted-foreground">
                          {t("Loading...")}
                        </td>
                      </tr>
                    ) : pageItems.length === 0 ? (
                      <tr>
                        <td colSpan={Math.max(colSpan, 1)} className="px-4 py-12 text-center text-muted-foreground">
                          {t("No monthly data yet.")}
                        </td>
                      </tr>
                    ) : (
                      pageItems.map((r) => {
                        const rate = settlementRate(r.totalSpend, r.settledSpend);
                        return (
                          <tr key={r.monthKey} className="border-b hover:bg-muted/30">
                            {columnVisible("month") ? (
                              <td className="px-4 py-3 font-medium">{r.monthLabel}</td>
                            ) : null}
                            {columnVisible("total") ? (
                              <td className="px-4 py-3 text-right tabular-nums font-medium">{fmtMoney(r.totalSpend)}</td>
                            ) : null}
                            {columnVisible("settled") ? (
                              <td className="px-4 py-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                                {fmtMoney(r.settledSpend)}
                              </td>
                            ) : null}
                            {columnVisible("pending") ? (
                              <td className="px-4 py-3 text-right tabular-nums text-amber-700 dark:text-amber-400">
                                {fmtMoney(r.pendingSpend)}
                              </td>
                            ) : null}
                            {columnVisible("rate") ? (
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Progress value={rate} className="h-2 flex-1" />
                                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                                    {rate}%
                                  </span>
                                </div>
                              </td>
                            ) : null}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {!loading && pageItems.length > 0 ? (
                    <tfoot>
                      <tr className="border-t bg-muted/30 font-medium">
                        {columnVisible("month") ? <td className="px-4 py-3">{t("Period total")}</td> : null}
                        {columnVisible("total") ? (
                          <td className="px-4 py-3 text-right tabular-nums">
                            {fmtMoney(periodTotals.total)}
                          </td>
                        ) : null}
                        {columnVisible("settled") ? (
                          <td className="px-4 py-3 text-right tabular-nums">
                            {fmtMoney(periodTotals.settled)}
                          </td>
                        ) : null}
                        {columnVisible("pending") ? (
                          <td className="px-4 py-3 text-right tabular-nums">
                            {fmtMoney(periodTotals.pending)}
                          </td>
                        ) : null}
                        {columnVisible("rate") ? <td className="px-4 py-3" /> : null}
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                {loading ? (
                  <div className="py-12 text-center text-muted-foreground">{t("Loading...")}</div>
                ) : pageItems.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">{t("No monthly data yet.")}</div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pageItems.map((r) => (
                      <Card key={r.monthKey} className="border-border/60 shadow-sm">
                        <CardContent className="space-y-3 p-4">
                          <div className="font-semibold">{r.monthLabel}</div>
                          <div className="space-y-1 text-sm">
                            <p>
                              {t("Total")}: <span className="font-medium tabular-nums">{fmtMoney(r.totalSpend)}</span>
                            </p>
                            <p className="text-emerald-700 dark:text-emerald-400">
                              {t("Settled")}: <span className="tabular-nums">{fmtMoney(r.settledSpend)}</span>
                            </p>
                            <p className="text-amber-700 dark:text-amber-400">
                              {t("Pending")}: <span className="tabular-nums">{fmtMoney(r.pendingSpend)}</span>
                            </p>
                          </div>
                          <Progress value={settlementRate(r.totalSpend, r.settledSpend)} className="h-2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </HrmProjectsStyleListPage>
        </CardContent>
      </Card>
    </div>
  );
}
