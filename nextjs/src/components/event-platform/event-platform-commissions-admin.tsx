"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleDollarSign,
  Clock,
  Info,
  Loader2,
  Percent,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  CommissionLedgerRow,
  CommissionOverviewPayload,
} from "@/lib/event-platform/commissions/commission-overview-types";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";
import { formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

const LEDGER_PAGE_SIZE = 10;

function money(settings: ReturnType<typeof useAppSettings>["settings"], value: number | string) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return formatCurrency(n, settings);
}

function formatLedgerDate(iso: string) {
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "paid") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (s === "pending") return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  if (s === "batched") return "bg-sky-500/15 text-sky-700 dark:text-sky-400";
  if (s === "refunded") return "bg-red-500/15 text-red-700 dark:text-red-400";
  return "bg-muted text-muted-foreground";
}

function KpiCard(props: {
  label: string;
  value: string;
  trendLabel: string;
  direction: "up" | "down" | "flat";
  icon: React.ReactNode;
  iconClass: string;
}) {
  const up = props.direction === "up";
  const down = props.direction === "down";
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
          <p className="text-2xl font-bold tracking-tight">{props.value}</p>
          <p
            className={cn(
              "flex items-center gap-1 text-xs",
              up && "text-emerald-600 dark:text-emerald-400",
              down && "text-red-600 dark:text-red-400",
              !up && !down && "text-muted-foreground",
            )}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : null}
            {down ? <TrendingDown className="h-3 w-3" /> : null}
            {props.trendLabel}
          </p>
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", props.iconClass)}>
          {props.icon}
        </div>
      </CardContent>
    </Card>
  );
}

function LedgerTable({
  rows,
  settings,
  emptyMessage,
}: {
  rows: CommissionLedgerRow[];
  settings: ReturnType<typeof useAppSettings>["settings"];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">{emptyMessage ?? "No ledger entries yet."}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Booking ID</TableHead>
            <TableHead>Event / Workshop</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead className="text-right">Gross Amount</TableHead>
            <TableHead className="text-right">Commission %</TableHead>
            <TableHead className="text-right">Platform Commission</TableHead>
            <TableHead className="text-right">Vendor Net</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap">{formatLedgerDate(row.date)}</TableCell>
              <TableCell className="font-mono text-xs">{row.bookingId}</TableCell>
              <TableCell className="max-w-[200px] truncate">{row.eventTitle}</TableCell>
              <TableCell className="max-w-[160px] truncate">{row.vendorName}</TableCell>
              <TableCell className="text-right tabular-nums">{money(settings, row.grossAmount)}</TableCell>
              <TableCell className="text-right tabular-nums">{row.commissionPercent}%</TableCell>
              <TableCell className="text-right tabular-nums">{money(settings, row.platformCommission)}</TableCell>
              <TableCell className="text-right tabular-nums">{money(settings, row.vendorNet)}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={cn("capitalize", statusBadgeClass(row.status))}>
                  {row.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function EventPlatformCommissionsAdmin() {
  const { settings } = useAppSettings();
  const [data, setData] = React.useState<CommissionOverviewPayload | null>(null);
  const [rate, setRate] = React.useState("10");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [tab, setTab] = React.useState("overview");
  const [ledgerPage, setLedgerPage] = React.useState(1);
  const [ledgerPerPage, setLedgerPerPage] = React.useState(LEDGER_PAGE_SIZE);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/event-platform/commissions/overview", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as CommissionOverviewPayload | { message?: string } | null;
      if (!res.ok || !json || !("ok" in json) || !json.ok) {
        throw new Error((json as { message?: string } | null)?.message ?? "Could not load commission data.");
      }
      setData(json);
      setRate(String(json.globalCommissionRate ?? 10));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not load commission data.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/commissions/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ globalCommissionRate: Number(rate) }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !json?.ok) throw new Error(json?.message ?? "Save failed.");
      toast.success("Commission settings saved.");
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const allLedger = data?.recentLedger ?? [];

  const demoLedgerFull = React.useMemo(() => {
    if (!data?.isDemo) return allLedger;
    const templates = data.recentLedger;
    if (!templates.length) return [];
    const rows: CommissionLedgerRow[] = [];
    for (let i = 0; i < data.ledgerTotal; i++) {
      const t = templates[i % templates.length];
      const n = data.ledgerTotal - i;
      rows.push({
        ...t,
        id: `demo-${i + 1}`,
        bookingId: `BK-${87000 + n}`,
        date: new Date(2026, 4, 28 - (i % 28)).toISOString().slice(0, 10),
      });
    }
    return rows;
  }, [allLedger, data]);

  const ledgerTotal = data?.isDemo ? (data.ledgerTotal ?? demoLedgerFull.length) : allLedger.length;
  const ledgerLastPage = Math.max(1, Math.ceil(ledgerTotal / ledgerPerPage));
  const ledgerPageSafe = Math.min(ledgerPage, ledgerLastPage);
  const ledgerSource = data?.isDemo ? demoLedgerFull : allLedger;
  const ledgerSlice = ledgerSource.slice((ledgerPageSafe - 1) * ledgerPerPage, ledgerPageSafe * ledgerPerPage);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading commission data…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">Commission data could not be loaded.</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Manage platform commission settings and track commission earnings.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {data.isDemo ? (
            <Badge variant="secondary" className="font-normal">
              Demo data
            </Badge>
          ) : null}
          <Select value="current-month" disabled>
            <SelectTrigger className="w-[220px]">
              <SelectValue>{data.periodLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">{data.periodLabel}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="overview" className="data-[state=active]:bg-muted">
            Overview
          </TabsTrigger>
          <TabsTrigger value="vendor-plans" className="data-[state=active]:bg-muted">
            Vendor Commission Plans
          </TabsTrigger>
          <TabsTrigger value="rules" className="data-[state=active]:bg-muted">
            Commission Rules
          </TabsTrigger>
          <TabsTrigger value="ledger" className="data-[state=active]:bg-muted">
            Commission Ledger
          </TabsTrigger>
          <TabsTrigger value="payouts" className="data-[state=active]:bg-muted">
            Payouts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label="Gross Sales"
              value={money(settings, data.kpis.grossSales.amount)}
              trendLabel={data.kpis.grossSales.changeLabel}
              direction={data.kpis.grossSales.direction}
              icon={<CircleDollarSign className="h-5 w-5 text-emerald-600" />}
              iconClass="bg-emerald-500/10"
            />
            <KpiCard
              label="Platform Commission"
              value={money(settings, data.kpis.platformCommission.amount)}
              trendLabel={data.kpis.platformCommission.changeLabel}
              direction={data.kpis.platformCommission.direction}
              icon={<Percent className="h-5 w-5 text-violet-600" />}
              iconClass="bg-violet-500/10"
            />
            <KpiCard
              label="Paid Commission"
              value={money(settings, data.kpis.paidCommission.amount)}
              trendLabel={data.kpis.paidCommission.changeLabel}
              direction={data.kpis.paidCommission.direction}
              icon={<Wallet className="h-5 w-5 text-sky-600" />}
              iconClass="bg-sky-500/10"
            />
            <KpiCard
              label="Pending Commission"
              value={money(settings, data.kpis.pendingCommission.amount)}
              trendLabel={data.kpis.pendingCommission.changeLabel}
              direction={data.kpis.pendingCommission.direction}
              icon={<Clock className="h-5 w-5 text-amber-600" />}
              iconClass="bg-amber-500/10"
            />
            <KpiCard
              label="Refunded Commission"
              value={money(settings, data.kpis.refundedCommission.amount)}
              trendLabel={data.kpis.refundedCommission.changeLabel}
              direction={data.kpis.refundedCommission.direction}
              icon={<RefreshCcw className="h-5 w-5 text-red-600" />}
              iconClass="bg-red-500/10"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Global commission settings</CardTitle>
                  <CardDescription>
                    Default rate applied when no vendor or event override is set.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => void saveSettings(e)} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="global-rate">Commission rate (%)</Label>
                      <Input
                        id="global-rate"
                        inputMode="decimal"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                      />
                    </div>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  <Info className="h-4 w-4" />
                  How it works
                </div>
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-emerald-900/90 dark:text-emerald-200/90">
                  <li>Commission is calculated on gross sales for each paid booking.</li>
                  <li>Vendor or event-specific plans can override the global rate.</li>
                  <li>Refunds and cancellations adjust commission totals automatically.</li>
                </ul>
              </div>
            </div>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Commission trend</CardTitle>
                <CardDescription>Gross sales vs platform commission — last 6 months</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px] pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} />
                    <Tooltip
                      formatter={(value, name) => {
                        const v = Number(value ?? 0);
                        return [
                          money(settings, v),
                          name === "grossSales" ? "Gross Sales" : "Platform Commission",
                        ];
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="grossSales"
                      name="Gross Sales"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="platformCommission"
                      name="Platform Commission"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base">Recent commission ledger</CardTitle>
                <CardDescription>Latest bookings with platform commission breakdown.</CardDescription>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setTab("ledger")}>
                View all ledger
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <LedgerTable rows={data.recentLedger} settings={settings} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendor-plans" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Vendor commission plans</CardTitle>
              <CardDescription>Default and custom commission rates per vendor.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Events</TableHead>
                      <TableHead className="text-right">Earned to date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.vendorPlans.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.vendorName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {row.planType === "custom" ? "Custom Plan" : "Default Plan"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{row.commissionRate}%</TableCell>
                        <TableCell className="text-right">{row.eventsCount}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(settings, row.earnedToDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Commission rules</CardTitle>
              <CardDescription>Event-level overrides linked to vendors.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event / Workshop</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.commissionRules.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.eventTitle}</TableCell>
                        <TableCell>{row.vendorName}</TableCell>
                        <TableCell className="text-right">{row.commissionRate}%</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={row.isActive ? statusBadgeClass("paid") : "bg-muted text-muted-foreground"}
                          >
                            {row.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-6 space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Commission ledger</CardTitle>
              <CardDescription>All platform commission entries from event bookings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-0 pb-4">
              <LedgerTable rows={ledgerSlice} settings={settings} />
              {ledgerTotal > 0 ? (
                <div className="flex flex-col gap-3 border-t px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Pagination
                    page={ledgerPageSafe}
                    lastPage={ledgerLastPage}
                    total={ledgerTotal}
                    from={(ledgerPageSafe - 1) * ledgerPerPage + 1}
                    to={Math.min(ledgerPageSafe * ledgerPerPage, ledgerTotal)}
                    onPageChange={setLedgerPage}
                    entityLabel="entries"
                  />
                  <Select
                    value={String(ledgerPerPage)}
                    onValueChange={(v) => {
                      setLedgerPerPage(Number(v));
                      setLedgerPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50].map((n) => (
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
        </TabsContent>

        <TabsContent value="payouts" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Vendor payouts</CardTitle>
              <CardDescription>Create payout batches from pending commission ledger entries.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                Manage payout batches, pending vendor balances, and paid transfers on the dedicated payouts page.
              </p>
              <Button asChild>
                <Link href={EVENT_PLATFORM_PATHS.payouts}>
                  Open payouts
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
