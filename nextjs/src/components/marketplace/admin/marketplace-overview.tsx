"use client";

import * as React from "react";
import Link from "next/link";
import { format, subDays } from "date-fns";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Calendar,
  Clock,
  DollarSign,
  Map,
  Package,
  Settings2,
  ShoppingCart,
  Store,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { LineChart } from "@/components/charts";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

type Stats = {
  vendorCount: number;
  activeVendors: number;
  productCount: number;
  orderCount: number;
  openDeliveries: number;
  queueCount: number;
  grossRevenue: number;
};

type PeriodMetrics = {
  orders: number;
  ordersChange: number | null;
  revenue: number;
  revenueChange: number | null;
  deliveries: number;
  deliveriesChange: number | null;
  vendors: number;
  vendorsChange: number | null;
  products: number;
  productsChange: number | null;
};

type ChartPoint = {
  date: string;
  label: string;
  orders: number;
  revenue: number;
  deliveries: number;
};

type StatusSlice = {
  status: string;
  count: number;
  percent: number;
  color: string;
};

type RecentOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
};

type TopVendor = {
  vendorId: string | null;
  vendorName: string;
  logoUrl: string | null;
  orderCount: number;
  revenue: number;
};

type ActiveQueue = {
  id: string;
  city: string;
  state: string;
  vendorName: string | null;
  deliveryCount: number;
  queueStatus: string;
};

const QUICK_ACTIONS = [
  { label: "Add Vendor", href: "/marketplace/admin/vendors", icon: Store },
  { label: "Add Product", href: "/marketplace/admin/products", icon: Package },
  { label: "Create Order", href: "/marketplace/admin/orders", icon: ShoppingCart },
  { label: "Delivery Map", href: "/admin/marketplace/delivery-map", icon: Map },
  { label: "Delivery Queue", href: "/admin/marketplace/delivery-queue", icon: Boxes },
  { label: "Delivery Events", href: "/admin/marketplace/delivery-events", icon: Truck },
] as const;

function statusTone(status: string): "default" | "secondary" | "outline" {
  if (status === "scheduled" || status === "delivered" || status === "paid") return "default";
  return "secondary";
}

function queueStatusLabel(status: string): { label: string; className: string } {
  if (status === "scheduled") {
    return {
      label: "Scheduled",
      className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
    };
  }
  return {
    label: "In Progress",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ChangeBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-muted-foreground">No change</span>;
  }
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
      )}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}
      {value}%
    </span>
  );
}

function VendorAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
      {initials(name)}
    </span>
  );
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export default function MarketplaceOverview() {
  const { settings } = useAppSettings();
  const today = React.useMemo(() => new Date(), []);
  const [dateFrom, setDateFrom] = React.useState(() => format(subDays(today, 6), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = React.useState(() => format(today, "yyyy-MM-dd"));
  const [chartPeriod, setChartPeriod] = React.useState("week");

  const [stats, setStats] = React.useState<Stats | null>(null);
  const [periodMetrics, setPeriodMetrics] = React.useState<PeriodMetrics | null>(null);
  const [chartSeries, setChartSeries] = React.useState<ChartPoint[]>([]);
  const [ordersByStatus, setOrdersByStatus] = React.useState<StatusSlice[]>([]);
  const [totalStatusOrders, setTotalStatusOrders] = React.useState(0);
  const [recent, setRecent] = React.useState<RecentOrder[]>([]);
  const [topVendors, setTopVendors] = React.useState<TopVendor[]>([]);
  const [activeQueues, setActiveQueues] = React.useState<ActiveQueue[]>([]);
  const [loading, setLoading] = React.useState(true);

  const applyPeriodPreset = React.useCallback((preset: string) => {
    const end = new Date();
    let start = subDays(end, 6);
    if (preset === "month") start = subDays(end, 29);
    if (preset === "quarter") start = subDays(end, 89);
    setDateFrom(format(start, "yyyy-MM-dd"));
    setDateTo(format(end, "yyyy-MM-dd"));
    setChartPeriod(preset);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/marketplace/admin/overview", window.location.origin);
      url.searchParams.set("from", dateFrom);
      url.searchParams.set("to", dateTo);
      const res = await fetch(url.toString(), { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setStats(data.stats as Stats);
        setPeriodMetrics(data.periodMetrics as PeriodMetrics);
        setChartSeries(data.chartSeries as ChartPoint[]);
        setOrdersByStatus(data.ordersByStatus as StatusSlice[]);
        setTotalStatusOrders(data.totalStatusOrders ?? 0);
        setRecent(data.recentOrders as RecentOrder[]);
        setTopVendors(data.topVendors as TopVendor[]);
        setActiveQueues(data.activeQueues as ActiveQueue[]);
      }
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const dateRangeLabel = React.useMemo(() => {
    const from = new Date(`${dateFrom}T00:00:00`);
    const to = new Date(`${dateTo}T00:00:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "Select dates";
    return `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`;
  }, [dateFrom, dateTo]);

  const pieData = ordersByStatus.filter((s) => s.count > 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Monitor vendors, orders, deliveries, and revenue across your marketplace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 w-[130px] border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 w-[130px] border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
            />
          </div>
          <span className="hidden text-xs text-muted-foreground lg:inline">{dateRangeLabel}</span>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled>
            <Settings2 className="h-3.5 w-3.5" />
            Customize
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3">
        <DashboardStatCard
          label="Vendors"
          value={loading ? "…" : (stats?.vendorCount ?? 0)}
          sub={`${stats?.activeVendors ?? 0} active`}
          icon={<Store className="h-6 w-6 sm:h-7 sm:w-7" />}
          href="/marketplace/admin/vendors"
        />
        <DashboardStatCard
          label="Products"
          value={loading ? "…" : (stats?.productCount ?? 0)}
          sub="Listed products"
          icon={<Package className="h-6 w-6 sm:h-7 sm:w-7" />}
          href="/marketplace/admin/products"
        />
        <DashboardStatCard
          label="Orders"
          value={loading ? "…" : (stats?.orderCount ?? 0)}
          sub="All time"
          icon={<ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7" />}
          href="/marketplace/admin/orders"
        />
        <DashboardStatCard
          label="Open deliveries"
          value={loading ? "…" : (stats?.openDeliveries ?? 0)}
          sub="In progress"
          icon={<Truck className="h-6 w-6 sm:h-7 sm:w-7" />}
          href="/admin/marketplace/delivery-map"
        />
        <DashboardStatCard
          label="Delivery queues"
          value={loading ? "…" : (stats?.queueCount ?? 0)}
          sub="Active cities"
          icon={<Boxes className="h-6 w-6 sm:h-7 sm:w-7" />}
          href="/admin/marketplace/delivery-queue"
        />
        <DashboardStatCard
          label="Gross revenue"
          value={loading ? "…" : formatCurrency(stats?.grossRevenue ?? 0, settings)}
          sub="Collected to date"
          icon={<DollarSign className="h-6 w-6 sm:h-7 sm:w-7" />}
          href="/marketplace/admin/reports"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Marketplace Overview</CardTitle>
            <Select
              value={chartPeriod}
              onValueChange={(v) => {
                setChartPeriod(v);
                applyPeriodPreset(v);
              }}
            >
              <SelectTrigger className="h-8 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "Orders", value: periodMetrics?.orders ?? 0, change: periodMetrics?.ordersChange ?? null },
                {
                  label: "Revenue",
                  value: formatCurrency(periodMetrics?.revenue ?? 0, settings),
                  change: periodMetrics?.revenueChange ?? null,
                },
                {
                  label: "Deliveries",
                  value: periodMetrics?.deliveries ?? 0,
                  change: periodMetrics?.deliveriesChange ?? null,
                },
                { label: "Vendors", value: periodMetrics?.vendors ?? 0, change: periodMetrics?.vendorsChange ?? null },
                { label: "Products", value: periodMetrics?.products ?? 0, change: periodMetrics?.productsChange ?? null },
              ].map((m) => (
                <div key={m.label} className="rounded-lg border bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-lg font-semibold tabular-nums">{loading ? "…" : m.value}</p>
                  {!loading && <ChangeBadge value={m.change} />}
                </div>
              ))}
            </div>
            {loading ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Loading chart…</div>
            ) : chartSeries.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">No data for this period.</div>
            ) : (
              <LineChart
                data={chartSeries}
                xAxisKey="label"
                height={280}
                showLegend
                showGrid
                showTooltip
                lines={[
                  { dataKey: "orders", color: "#3b82f6", name: "Orders" },
                  { dataKey: "revenue", color: "#22c55e", name: "Revenue" },
                  { dataKey: "deliveries", color: "#a855f7", name: "Deliveries" },
                ]}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : pieData.length === 0 ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">No orders yet.</div>
            ) : (
              <div className="relative">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={58} outerRadius={88}>
                      {pieData.map((entry) => (
                        <Cell key={entry.status} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, item) => [
                        `${Number(value ?? 0)} (${(item.payload as StatusSlice).percent}%)`,
                        formatStatusLabel((item.payload as StatusSlice).status),
                      ]}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span className="text-xs capitalize">{formatStatusLabel(String(value))}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold tabular-nums">{totalStatusOrders}</p>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                  </div>
                </div>
              </div>
            )}
            {!loading && pieData.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {pieData.map((s) => (
                  <div key={s.status} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 capitalize">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {formatStatusLabel(s.status)}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{s.percent}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent orders
            </CardTitle>
            <Link
              href="/marketplace/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : recent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                      No orders yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recent.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="pl-6 font-medium">{o.orderNumber}</TableCell>
                      <TableCell className="max-w-[120px] truncate text-muted-foreground">{o.customerName}</TableCell>
                      <TableCell>
                        <Badge variant={statusTone(o.status)} className="capitalize">
                          {formatStatusLabel(o.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">{formatCurrency(o.total, settings)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">Top vendors</CardTitle>
            <Link
              href="/marketplace/admin/vendors"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Vendor</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="pr-6 text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : topVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                      No vendor data yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  topVendors.map((v) => (
                    <TableRow key={v.vendorId ?? v.vendorName}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2">
                          <VendorAvatar name={v.vendorName} logoUrl={v.logoUrl} />
                          <span className="truncate font-medium">{v.vendorName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{v.orderCount}</TableCell>
                      <TableCell className="pr-6 text-right tabular-nums">
                        {formatCurrency(v.revenue, settings)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">Active delivery queues</CardTitle>
            <Link
              href="/admin/marketplace/delivery-queue"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">City</TableHead>
                  <TableHead className="text-right">Deliveries</TableHead>
                  <TableHead className="pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : activeQueues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                      No active queues.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeQueues.map((q) => {
                    const st = queueStatusLabel(q.queueStatus);
                    return (
                      <TableRow key={q.id}>
                        <TableCell className="pl-6 font-medium">
                          {q.city}
                          {q.state ? `, ${q.state}` : ""}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{q.deliveryCount}</TableCell>
                        <TableCell className="pr-6">
                          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", st.className)}>
                            {st.label}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Button key={action.label} variant="outline" size="sm" className="h-8 gap-1.5" asChild>
                <Link href={action.href}>
                  <action.icon className="h-3.5 w-3.5" />
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
          <Button size="sm" className="h-8 gap-1.5 shrink-0" asChild>
            <Link href="/marketplace/admin/reports">
              <BarChart3 className="h-3.5 w-3.5" />
              View Reports
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
