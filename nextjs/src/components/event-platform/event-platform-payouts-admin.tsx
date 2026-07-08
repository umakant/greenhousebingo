"use client";

import * as React from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Loader2,
  Plus,
  Search,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSettings } from "@/contexts/app-settings-context";
import type {
  PayoutBatchRow,
  PayoutOverviewPayload,
} from "@/lib/event-platform/payouts/payout-overview-types";
import { formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#22c55e", "#f59e0b", "#6366f1", "#ef4444", "#94a3b8"];
const PAGE_SIZE = 5;

function money(settings: ReturnType<typeof useAppSettings>["settings"], value: number | string) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return formatCurrency(n, settings);
}

function formatDate(iso: string) {
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "paid" || s === "scheduled") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (s === "pending") return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  if (s === "processing" || s === "batched") return "bg-sky-500/15 text-sky-700 dark:text-sky-400";
  if (s === "failed") return "bg-red-500/15 text-red-700 dark:text-red-400";
  if (s === "cancelled") return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}

function KpiCard(props: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  iconClass: string;
  subClass?: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
          <p className="text-2xl font-bold tracking-tight">{props.value}</p>
          <p className={cn("text-xs", props.subClass ?? "text-muted-foreground")}>{props.sub}</p>
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", props.iconClass)}>
          {props.icon}
        </div>
      </CardContent>
    </Card>
  );
}

function BatchTable({ rows, settings }: { rows: PayoutBatchRow[]; settings: ReturnType<typeof useAppSettings>["settings"] }) {
  if (rows.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">No payout batches match your filters.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch ID</TableHead>
            <TableHead>Date Created</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Vendors</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payout Method</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs font-medium">{row.batchId}</TableCell>
              <TableCell className="whitespace-nowrap">{formatDate(row.dateCreated)}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">{row.periodLabel}</TableCell>
              <TableCell className="text-right tabular-nums">{row.vendorCount}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{money(settings, row.amount)}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={cn("capitalize", statusBadgeClass(row.status))}>
                  {row.status}
                </Badge>
              </TableCell>
              <TableCell>{row.payoutMethod}</TableCell>
              <TableCell className="text-right">
                <Button type="button" variant="outline" size="sm">
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function EventPlatformPayoutsAdmin() {
  const { settings } = useAppSettings();
  const [data, setData] = React.useState<PayoutOverviewPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState("batches");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [methodFilter, setMethodFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZE);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/event-platform/payouts/overview", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as PayoutOverviewPayload | { message?: string } | null;
      if (!res.ok || !json || !("ok" in json) || !json.ok) {
        throw new Error((json as { message?: string } | null)?.message ?? "Could not load payouts.");
      }
      setData(json);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not load payouts.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filteredBatches = React.useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.batches.filter((b) => {
      if (statusFilter !== "all" && b.status.toLowerCase() !== statusFilter) return false;
      if (methodFilter !== "all") {
        const methodKey = b.payoutMethod.toLowerCase().replace(/\s+/g, "_");
        if (methodFilter === "bank" && !methodKey.includes("bank")) return false;
        if (methodFilter === "paypal" && !methodKey.includes("paypal")) return false;
      }
      if (!q) return true;
      return (
        b.batchId.toLowerCase().includes(q) ||
        b.periodLabel.toLowerCase().includes(q) ||
        b.payoutMethod.toLowerCase().includes(q)
      );
    });
  }, [data, search, statusFilter, methodFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [search, statusFilter, methodFilter, perPage]);

  const total = filteredBatches.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const pageSafe = Math.min(page, lastPage);
  const pagedBatches = filteredBatches.slice((pageSafe - 1) * perPage, pageSafe * perPage);

  const pieData = (data?.statusOverview ?? []).map((s) => ({
    name: s.label,
    value: s.amount,
    percent: s.percent,
  }));

  function exportBatches() {
    if (!data) return;
    const rows = [
      ["Batch ID", "Date Created", "Period", "Vendors", "Amount", "Status", "Payout Method"],
      ...filteredBatches.map((b) => [
        b.batchId,
        b.dateCreated,
        b.periodLabel,
        String(b.vendorCount),
        b.amount,
        b.status,
        b.payoutMethod,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payout-batches.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded.");
  }

  function createBatch() {
    if (data?.isDemo) {
      toast.message("Demo mode", { description: "Connect vendors with pending commissions to create real payout batches." });
      return;
    }
    toast.message("Create batch", { description: "Select a vendor with pending commissions from the list below." });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading payouts…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">Payout data could not be loaded.</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Manage vendor payouts, track payout batches, and view payout history.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {data.isDemo ? (
            <Badge variant="secondary" className="font-normal">
              Demo data
            </Badge>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={exportBatches}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button type="button" size="sm" onClick={createBatch}>
            <Plus className="mr-2 h-4 w-4" />
            Create Payout Batch
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total Payouts"
          value={money(settings, data.kpis.totalPayouts.amount)}
          sub={data.kpis.totalPayouts.changeLabel}
          subClass="text-emerald-600 dark:text-emerald-400"
          icon={<Wallet className="h-5 w-5 text-emerald-600" />}
          iconClass="bg-emerald-500/10"
        />
        <KpiCard
          label="Pending Payouts"
          value={money(settings, data.kpis.pendingPayouts.amount)}
          sub={data.kpis.pendingPayouts.changeLabel}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          iconClass="bg-amber-500/10"
        />
        <KpiCard
          label="Paid This Month"
          value={money(settings, data.kpis.paidThisMonth.amount)}
          sub={data.kpis.paidThisMonth.changeLabel}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          iconClass="bg-emerald-500/10"
        />
        <KpiCard
          label="Vendors Paid"
          value={String(data.kpis.vendorsPaid.count)}
          sub={data.kpis.vendorsPaid.changeLabel}
          icon={<Users className="h-5 w-5 text-violet-600" />}
          iconClass="bg-violet-500/10"
        />
        <KpiCard
          label="Next Payout"
          value={data.kpis.nextPayout.label}
          sub={`${data.kpis.nextPayout.daysRemaining} days remaining`}
          icon={<Calendar className="h-5 w-5 text-sky-600" />}
          iconClass="bg-sky-500/10"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="batches" className="data-[state=active]:bg-muted">
            Payout Batches
          </TabsTrigger>
          <TabsTrigger value="payouts" className="data-[state=active]:bg-muted">
            Payouts
          </TabsTrigger>
          <TabsTrigger value="methods" className="data-[state=active]:bg-muted">
            Payout Methods
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-muted">
            Payout Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="batches" className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-sm">
            <div className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search batches…"
                className="h-9 pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[9rem]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="h-9 w-[11rem]">
                <SelectValue placeholder="All Payment Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Methods</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
              </SelectContent>
            </Select>
            <Select value="period" disabled>
              <SelectTrigger className="h-9 w-[12rem]">
                <SelectValue>{data.periodLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="period">{data.periodLabel}</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" className="h-9">
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              Filters
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setMethodFilter("all");
              }}
            >
              Reset
            </Button>
          </div>

          <Card className="shadow-sm">
            <CardContent className="space-y-4 p-0 pb-4">
              <BatchTable rows={pagedBatches} settings={settings} />
              {total > 0 ? (
                <div className="flex flex-col gap-3 border-t px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Pagination
                    page={pageSafe}
                    lastPage={lastPage}
                    total={total}
                    from={(pageSafe - 1) * perPage + 1}
                    to={Math.min(pageSafe * perPage, total)}
                    onPageChange={setPage}
                    entityLabel="entries"
                  />
                  <Select value={String(perPage)} onValueChange={(v) => setPerPage(Number(v))}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 25].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} / page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Payout status overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative mx-auto h-[220px] w-full max-w-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => money(settings, Number(value ?? 0))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">{money(settings, data.statusTotal)}</span>
                    <span className="text-xs text-muted-foreground">Total</span>
                  </div>
                </div>
                <div className="mt-2 space-y-1.5">
                  {data.statusOverview.map((s, i) => (
                    <div key={s.status} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        {s.label}
                      </span>
                      <span className="text-muted-foreground">{s.percent}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top vendors by payout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.topVendors.map((v) => (
                  <div key={v.rank} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {v.rank}
                      </span>
                      <span className="truncate">{v.vendorName}</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">{money(settings, v.amount)}</span>
                  </div>
                ))}
                <Button type="button" variant="link" className="h-auto p-0 text-sm" asChild>
                  <a href="/admin/event-platform/vendors">View all vendors →</a>
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Upcoming payouts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.upcomingPayouts.map((p) => (
                  <div key={p.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{formatDate(p.date)}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.vendorCount} vendor{p.vendorCount === 1 ? "" : "s"} · {money(settings, p.amount)}
                        </p>
                      </div>
                      <Badge variant="secondary" className={statusBadgeClass(p.status)}>
                        Scheduled
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="link" className="h-auto p-0 text-sm">
                  View all scheduled payouts →
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payouts" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Individual payouts</CardTitle>
              <CardDescription>Vendor-level payout transfers included in each batch.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <BatchTable rows={data.batches.filter((b) => b.status === "paid").slice(0, 10)} settings={settings} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Payout methods</CardTitle>
              <CardDescription>Supported vendor payout channels on the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {["Bank Transfer", "PayPal", "ACH", "Check"].map((method) => (
                <div key={method} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">{method}</span>
                  <Badge variant="outline">Active</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Payout settings</CardTitle>
              <CardDescription>Default schedule and batch processing rules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <TrendingUp className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
                <p className="text-emerald-900 dark:text-emerald-200">
                  Payout batches are generated from pending vendor commission ledger entries. Vendors receive net
                  amounts after platform commission is deducted.
                </p>
              </div>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>Default payout cycle: bi-weekly on the 1st and 15th.</li>
                <li>Minimum batch amount: $50.00 per vendor.</li>
                <li>Failed payouts are retried automatically within 3 business days.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
