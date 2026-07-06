"use client";

import * as React from "react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  ArrowRight,
  Calendar,
  CalendarDays,
  ChevronDown,
  DollarSign,
  Download,
  LayoutGrid,
  Loader2,
  Mail,
  Map,
  Palette,
  Plus,
  Settings,
  Store,
  Ticket,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppSettings } from "@/contexts/app-settings-context";
import type { EpTrendMetric, EventPlatformDashboardSummary } from "@/lib/event-platform/dashboard-types";
import { formatCurrency } from "@/lib/format-currency";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7"];

const QUICK_ACTIONS = [
  { label: "Create Event", href: EVENT_PLATFORM_PATHS.events, icon: Plus },
  { label: "Add Vendor", href: EVENT_PLATFORM_PATHS.vendors, icon: Store },
  { label: "Seat Maps", href: EVENT_PLATFORM_PATHS.seatmaps, icon: Map },
  { label: "Categories", href: EVENT_PLATFORM_PATHS.events, icon: LayoutGrid },
  { label: "Commission", href: EVENT_PLATFORM_PATHS.commissions, icon: TrendingUp },
  { label: "Payouts", href: EVENT_PLATFORM_PATHS.payouts, icon: Wallet },
  { label: "Payments", href: EVENT_PLATFORM_PATHS.payments, icon: DollarSign },
  { label: "Settings", href: EVENT_PLATFORM_PATHS.settings, icon: Settings },
];

function money(settings: ReturnType<typeof useAppSettings>["settings"], value: string | number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return formatCurrency(n, settings);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "confirmed" || s === "active" || s === "paid" || s === "completed") {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  }
  if (s === "pending" || s === "batched") {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  }
  if (s === "cancelled" || s === "rejected" || s === "refunded") {
    return "bg-red-500/15 text-red-700 dark:text-red-400";
  }
  return "bg-muted text-muted-foreground";
}

function formatEventType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function KpiCard(props: {
  label: string;
  value: string;
  trend: EpTrendMetric;
  icon: React.ReactNode;
  iconClass: string;
}) {
  const up = props.trend.direction === "up";
  const down = props.trend.direction === "down";
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
            {props.trend.changeLabel}
          </p>
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", props.iconClass)}>
          {props.icon}
        </div>
      </CardContent>
    </Card>
  );
}

export function EventPlatformOverview() {
  const { settings } = useAppSettings();
  const [data, setData] = React.useState<EventPlatformDashboardSummary | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [chartMode, setChartMode] = React.useState<"monthly" | "weekly">("monthly");

  const dateLabel = React.useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }, []);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch("/api/event-platform/dashboard", { credentials: "include", cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        summary?: EventPlatformDashboardSummary;
        message?: string;
      } | null;
      if (!res.ok || !json?.ok || !json.summary) {
        setErr(json?.message ?? "Could not load dashboard.");
        return;
      }
      setData(json.summary);
    })();
  }, []);

  const chartData = data?.revenueByMonth ?? [];
  const pieData = data?.bookingsByStatus ?? [];
  const bookingTotal = pieData.reduce((s, x) => s + x.count, 0);

  function exportSummary() {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Events", data.totalEvents],
      ["Total Bookings", data.totalBookings],
      ["Gross Revenue", data.grossRevenue],
      ["Platform Commission", data.totalPlatformCommission],
      ["Active Vendors", data.activeVendors],
      ["Pending Payouts", data.pendingPayoutAmount],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "event-platform-summary.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (err) {
    return <p className="text-sm text-destructive">{err}</p>;
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Event Platform Overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor events, bookings, revenue, vendors, and payouts across your marketplace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {dateLabel}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportSummary}>
                <Download className="mr-2 h-4 w-4" />
                Summary CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Total Events"
          value={String(data.totalEvents)}
          trend={data.trends.events}
          icon={<Calendar className="h-5 w-5 text-violet-600" />}
          iconClass="bg-violet-500/10"
        />
        <KpiCard
          label="Total Bookings"
          value={data.totalBookings.toLocaleString()}
          trend={data.trends.bookings}
          icon={<Ticket className="h-5 w-5 text-blue-600" />}
          iconClass="bg-blue-500/10"
        />
        <KpiCard
          label="Gross Revenue"
          value={money(settings, data.grossRevenue)}
          trend={data.trends.revenue}
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          iconClass="bg-emerald-500/10"
        />
        <KpiCard
          label="Platform Commission"
          value={money(settings, data.totalPlatformCommission)}
          trend={data.trends.commission}
          icon={<TrendingUp className="h-5 w-5 text-indigo-600" />}
          iconClass="bg-indigo-500/10"
        />
        <KpiCard
          label="Active Vendors"
          value={String(data.activeVendors)}
          trend={data.trends.activeVendors}
          icon={<Users className="h-5 w-5 text-orange-600" />}
          iconClass="bg-orange-500/10"
        />
        <KpiCard
          label="Pending Payouts"
          value={money(settings, data.pendingPayoutAmount)}
          trend={data.trends.pendingPayouts}
          icon={<Wallet className="h-5 w-5 text-rose-600" />}
          iconClass="bg-rose-500/10"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Revenue &amp; Commission Trend</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </div>
            <div className="flex rounded-md border p-0.5 text-xs">
              <button
                type="button"
                className={cn(
                  "rounded px-2 py-1",
                  chartMode === "monthly" && "bg-muted font-medium",
                )}
                onClick={() => setChartMode("monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={cn(
                  "rounded px-2 py-1 text-muted-foreground",
                  chartMode === "weekly" && "bg-muted font-medium text-foreground",
                )}
                onClick={() => setChartMode("weekly")}
              >
                Weekly
              </button>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="commission"
                  name="Commission"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Bookings by Status</CardTitle>
            <CardDescription>{bookingTotal.toLocaleString()} total bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mx-auto h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{bookingTotal}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5 text-xs">
              {pieData.map((s, i) => (
                <li key={s.status} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    {s.label}
                  </span>
                  <span className="text-muted-foreground">{s.percent}%</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Top Performing Events</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={EVENT_PLATFORM_PATHS.events}>
                    View all <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.topPerformingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No revenue data yet.</p>
                ) : (
                  data.topPerformingEvents.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {ev.rank}
                      </span>
                      {ev.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ev.imageUrl} alt="" className="h-10 w-10 rounded-md object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{ev.title}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {money(settings, ev.revenue)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {QUICK_ACTIONS.map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="flex flex-col items-center gap-2 rounded-lg border border-transparent p-3 text-center transition-colors hover:border-border hover:bg-muted/50"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <action.icon className="h-5 w-5" />
                      </span>
                      <span className="text-xs font-medium leading-tight">{action.label}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Bookings</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href={EVENT_PLATFORM_PATHS.events}>
                  View all <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {data.recentBookings.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No bookings yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentBookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-[10px]">{initials(b.attendeeName)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{b.attendeeName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-sm">{b.eventTitle}</TableCell>
                        <TableCell className="text-sm">{money(settings, b.amount)}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              statusBadge(b.status),
                            )}
                          >
                            {b.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Vendor Payout Summary</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href={EVENT_PLATFORM_PATHS.payouts}>
                  View all <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {data.vendorPayoutSummary.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No pending vendor payouts.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Last Payout</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.vendorPayoutSummary.map((v) => (
                      <TableRow key={v.vendorId}>
                        <TableCell>
                          <Link
                            href={EVENT_PLATFORM_PATHS.vendorDetail(v.vendorId)}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {v.vendorName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{money(settings, v.pendingAmount)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {v.lastPayoutAt ? format(new Date(v.lastPayoutAt), "MMM d, yyyy") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Upcoming Events</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/lms/events">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming events scheduled.</p>
              ) : (
                data.upcomingEvents.map((ev) => (
                  <div key={ev.id} className="flex gap-3">
                    {ev.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ev.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="line-clamp-2 text-sm font-medium leading-snug">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(ev.startsAt), "MMM d, yyyy · h:mm a")}
                      </p>
                      {ev.venueName ? (
                        <p className="truncate text-xs text-muted-foreground">{ev.venueName}</p>
                      ) : null}
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {ev.categoryName ?? formatEventType(ev.eventType)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Recent Vendors</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href={EVENT_PLATFORM_PATHS.vendors}>View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.recentVendors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No vendors yet.</p>
              ) : (
                data.recentVendors.slice(0, 4).map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                    <Link
                      href={EVENT_PLATFORM_PATHS.vendorDetail(v.id)}
                      className="truncate text-sm font-medium hover:text-primary"
                    >
                      {v.vendorName}
                    </Link>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs capitalize", statusBadge(v.status))}>
                      {v.status}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={EVENT_PLATFORM_PATHS.appearance}>
                  <Palette className="mr-1 h-3.5 w-3.5" />
                  Appearance
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={EVENT_PLATFORM_PATHS.email}>
                  <Mail className="mr-1 h-3.5 w-3.5" />
                  Email
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={EVENT_PLATFORM_PATHS.popups}>Popups</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity feed */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Platform Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data.platformActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-1">
              {data.platformActivity.map((a) => (
                <div
                  key={a.id}
                  className="min-w-[200px] shrink-0 rounded-lg border bg-muted/30 px-4 py-3"
                >
                  <p className="text-sm font-medium">{a.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{relativeTime(a.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
