"use client";

import * as React from "react";
import { DollarSign, ShoppingCart } from "lucide-react";

import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { Badge } from "@/components/ui/badge";
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

type Report = {
  summary: { grossRevenue: number; orderCount: number };
  ordersByStatus: { status: string; count: number; total: number }[];
  ordersByPayment: { paymentStatus: string; count: number }[];
  topVendors: { vendorId: string | null; vendorName: string; revenue: number; unitsSold: number }[];
};

export default function MarketplaceReports({
  apiBase = "/api/marketplace/admin",
  topItemsLabel = "Top vendors",
  topItemsColumn = "Vendor",
}: {
  apiBase?: string;
  topItemsLabel?: string;
  topItemsColumn?: string;
}) {
  const { settings } = useAppSettings();
  const [report, setReport] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/marketplace/admin/reports", { credentials: "include" });
        const data = await res.json().catch(() => null);
        if (active && data?.ok) setReport(data as Report);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [apiBase]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <DashboardStatCard
          label="Gross revenue"
          value={loading ? "…" : formatCurrency(report?.summary.grossRevenue ?? 0, settings)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <DashboardStatCard
          label="Total orders"
          value={loading ? "…" : (report?.summary.orderCount ?? 0)}
          icon={<ShoppingCart className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-background">
          <div className="border-b p-4">
            <h2 className="text-sm font-semibold">Orders by status</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(report?.ordersByStatus ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                    No data.
                  </TableCell>
                </TableRow>
              ) : (
                report?.ordersByStatus.map((r) => (
                  <TableRow key={r.status}>
                    <TableCell>
                      <Badge variant="secondary">{r.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{r.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.total, settings)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-xl border bg-background">
          <div className="border-b p-4">
            <h2 className="text-sm font-semibold">{topItemsLabel}</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{topItemsColumn}</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(report?.topVendors ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                    No data.
                  </TableCell>
                </TableRow>
              ) : (
                report?.topVendors.map((v) => (
                  <TableRow key={v.vendorId ?? v.vendorName}>
                    <TableCell className="font-medium">{v.vendorName}</TableCell>
                    <TableCell className="text-right">{v.unitsSold}</TableCell>
                    <TableCell className="text-right">{formatCurrency(v.revenue, settings)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
