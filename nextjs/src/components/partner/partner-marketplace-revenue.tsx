"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MonthPoint = { month: string; revenue: number; orders: number };
type TopCompany = { companyId: string; name: string; revenue: number; orders: number };
type Totals = {
  revenue: number;
  orders: number;
  buyers: number;
  referredCompanies: number;
  commissionEarned: number;
  commissionPaid: number;
};

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n || 0);
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, 1)).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export default function PartnerMarketplaceRevenue() {
  const [totals, setTotals] = React.useState<Totals>({
    revenue: 0,
    orders: 0,
    buyers: 0,
    referredCompanies: 0,
    commissionEarned: 0,
    commissionPaid: 0,
  });
  const [months, setMonths] = React.useState<MonthPoint[]>([]);
  const [topCompanies, setTopCompanies] = React.useState<TopCompany[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/partner/marketplace/revenue", { credentials: "include" });
        const d = await res.json();
        if (d?.ok) {
          setTotals(d.totals as Totals);
          setMonths(d.months as MonthPoint[]);
          setTopCompanies(d.topCompanies as TopCompany[]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxRevenue = Math.max(1, ...months.map((m) => m.revenue));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <DashboardStatCard label="Marketplace revenue" value={loading ? "…" : money(totals.revenue)} />
        <DashboardStatCard label="Paid orders" value={loading ? "…" : String(totals.orders)} />
        <DashboardStatCard label="Buying companies" value={loading ? "…" : String(totals.buyers)} />
        <DashboardStatCard label="Commission earned" value={loading ? "…" : money(totals.commissionEarned)} />
        <DashboardStatCard label="Commission paid" value={loading ? "…" : money(totals.commissionPaid)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue (last 12 months)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex h-48 items-end gap-2">
              {months.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end" title={`${money(m.revenue)} · ${m.orders} orders`}>
                    <div
                      className="w-full rounded-t bg-primary/80"
                      style={{ height: `${Math.max(2, (m.revenue / maxRevenue) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{monthLabel(m.month)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top referred companies by marketplace revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                    {loading ? "Loading…" : "No marketplace revenue yet."}
                  </TableCell>
                </TableRow>
              ) : (
                topCompanies.map((c) => (
                  <TableRow key={c.companyId}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right">{c.orders}</TableCell>
                    <TableCell className="text-right">{money(c.revenue)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
