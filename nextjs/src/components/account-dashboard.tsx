"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "@/components/charts";
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  Clock,
  FileText,
  Receipt,
  UserCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";
import { cn } from "@/lib/utils";

type Stats = {
  total_clients: number;
  total_vendors: number;
  total_customer_payment: number;
  total_vendor_payment: number;
};

type MonthPayment = { month: string; customer_payments?: number; vendor_payments?: number };

type RecentItem = {
  id: number;
  title: string;
  description: string;
  amount: number;
  date: string;
  status?: string;
  method?: string;
};

type FinanceActivityItem = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  amount: number;
  direction: "in" | "out" | "neutral";
  date: string;
  href: string;
  status?: string;
};

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  customer_payment: ArrowDownCircle,
  vendor_payment: ArrowUpCircle,
  revenue: ArrowDownCircle,
  expense: ArrowUpCircle,
  invoice: Receipt,
  proposal: FileText,
};

function RecentList({
  items,
  emptyLabel,
  formatAmount,
  fmtDate,
  amountClassName,
}: {
  items: RecentItem[];
  emptyLabel: string;
  formatAmount: (n: number) => string;
  fmtDate: (d: string) => string;
  amountClassName?: string;
}) {
  if (items.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <>
      {items.slice(0, 8).map((item) => (
        <div key={item.id} className="flex items-start justify-between px-4 py-3 transition-colors hover:bg-muted/30">
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-sm font-semibold leading-tight">{item.title}</p>
            {item.description ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{fmtDate(item.date)}</span>
              {item.method ? <span>{item.method}</span> : null}
              {item.status ? (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal capitalize">
                  {item.status}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className={cn("shrink-0 whitespace-nowrap text-sm font-bold", amountClassName ?? "text-muted-foreground")}>
            {formatAmount(item.amount)}
          </div>
        </div>
      ))}
    </>
  );
}

export function AccountDashboard() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [monthlyCustomerPayments, setMonthlyCustomerPayments] = React.useState<MonthPayment[]>([]);
  const [monthlyVendorPayments, setMonthlyVendorPayments] = React.useState<MonthPayment[]>([]);
  const [recentRevenues, setRecentRevenues] = React.useState<RecentItem[]>([]);
  const [recentExpenses, setRecentExpenses] = React.useState<RecentItem[]>([]);
  const [recentCustomerPayments, setRecentCustomerPayments] = React.useState<RecentItem[]>([]);
  const [recentVendorPayments, setRecentVendorPayments] = React.useState<RecentItem[]>([]);
  const [financeActivity, setFinanceActivity] = React.useState<FinanceActivityItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/account/dashboard", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        setStats(data.stats ?? null);
        setMonthlyCustomerPayments(Array.isArray(data.monthlyCustomerPayments) ? data.monthlyCustomerPayments : []);
        setMonthlyVendorPayments(Array.isArray(data.monthlyVendorPayments) ? data.monthlyVendorPayments : []);
        setRecentRevenues(Array.isArray(data.recentRevenues) ? data.recentRevenues : []);
        setRecentExpenses(Array.isArray(data.recentExpenses) ? data.recentExpenses : []);
        setRecentCustomerPayments(Array.isArray(data.recentCustomerPayments) ? data.recentCustomerPayments : []);
        setRecentVendorPayments(Array.isArray(data.recentVendorPayments) ? data.recentVendorPayments : []);
        setFinanceActivity(Array.isArray(data.financeActivity) ? data.financeActivity : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

  const { settings } = useAppSettings();
  const formatAmount = (amount: number) => formatCurrency(amount, settings);
  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    try {
      return fmtDateLib(d, settings);
    } catch {
      return d;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t("Loading...")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  const s = stats ?? {
    total_clients: 0,
    total_vendors: 0,
    total_customer_payment: 0,
    total_vendor_payment: 0,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          label={t("Total Clients")}
          value={s.total_clients || 0}
          sub={t("Active clients")}
          href="/account/customers"
          icon={<UserCheck className="h-8 w-8" />}
        />
        <DashboardStatCard
          label={t("Total Vendors")}
          value={s.total_vendors || 0}
          sub={t("Active vendors")}
          href="/account/vendors"
          icon={<Building2 className="h-8 w-8" />}
        />
        <DashboardStatCard
          label={t("Total Customer Payment")}
          value={formatAmount(s.total_customer_payment || 0)}
          sub={t("Received payments")}
          href="/account/customer-payments"
          icon={<ArrowDownCircle className="h-8 w-8" />}
        />
        <DashboardStatCard
          label={t("Total Vendor Payment")}
          value={formatAmount(s.total_vendor_payment || 0)}
          sub={t("Paid to vendors")}
          href="/account/vendor-payments"
          icon={<ArrowUpCircle className="h-8 w-8" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="h-96">
            <CardHeader>
              <CardTitle className="text-base">{t("Monthly Customer Payments")}</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart
                data={monthlyCustomerPayments}
                height={300}
                showTooltip
                showGrid
                lines={[{ dataKey: "customer_payments", color: "#10b981", name: t("Customer Payments") }]}
                xAxisKey="month"
                showLegend
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">{t("Recent Customer Payments")}</CardTitle>
              <Link href="/account/customer-payments" className="text-xs font-medium text-primary hover:underline">
                {t("View all")}
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-72 divide-y overflow-y-auto">
                <RecentList
                  items={recentCustomerPayments}
                  emptyLabel={t("No recent customer payments")}
                  formatAmount={formatAmount}
                  fmtDate={fmtDate}
                  amountClassName="text-emerald-600"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">{t("Recent Revenue")}</CardTitle>
              <span className="text-xs text-muted-foreground">{t("Last 5 days")}</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-72 divide-y overflow-y-auto">
                <RecentList
                  items={recentRevenues}
                  emptyLabel={t("No recent revenue")}
                  formatAmount={formatAmount}
                  fmtDate={fmtDate}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="h-96">
            <CardHeader>
              <CardTitle className="text-base">{t("Monthly Vendor Payments")}</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart
                data={monthlyVendorPayments}
                height={300}
                showTooltip
                showGrid
                lines={[{ dataKey: "vendor_payments", color: "#ef4444", name: t("Vendor Payments") }]}
                xAxisKey="month"
                showLegend
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">{t("Recent Vendor Payments")}</CardTitle>
              <Link href="/account/vendor-payments" className="text-xs font-medium text-primary hover:underline">
                {t("View all")}
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-72 divide-y overflow-y-auto">
                <RecentList
                  items={recentVendorPayments}
                  emptyLabel={t("No recent vendor payments")}
                  formatAmount={formatAmount}
                  fmtDate={fmtDate}
                  amountClassName="text-red-600"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">{t("Recent Expenses")}</CardTitle>
              <span className="text-xs text-muted-foreground">{t("Last 5 days")}</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-72 divide-y overflow-y-auto">
                <RecentList
                  items={recentExpenses}
                  emptyLabel={t("No recent expenses")}
                  formatAmount={formatAmount}
                  fmtDate={fmtDate}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">{t("Finance Activity & Tracking")}</CardTitle>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {t("Payments, invoices, proposals, revenue & expenses")}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {financeActivity.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("Activity will appear here as payments, invoices, and proposals are recorded.")}
            </p>
          ) : (
            <ul className="divide-y">
              {financeActivity.map((item) => {
                const Icon = ACTIVITY_ICONS[item.type] ?? Activity;
                const amountPrefix = item.direction === "in" ? "+" : item.direction === "out" ? "−" : "";
                const amountColor =
                  item.direction === "in"
                    ? "text-emerald-600"
                    : item.direction === "out"
                      ? "text-red-600"
                      : "text-muted-foreground";
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/80 ring-1 ring-border/50">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-tight">{item.title}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">{item.subtitle}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{fmtDate(item.date)}</span>
                          {item.status ? (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal capitalize">
                              {item.status}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <span className={cn("shrink-0 text-sm font-bold tabular-nums", amountColor)}>
                        {amountPrefix}
                        {formatAmount(item.amount)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
