"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

type Referral = {
  companyId: string;
  name: string;
  email: string | null;
  isActive: boolean;
  referralSource: string | null;
  referredAt: string | null;
  marketplaceOrders: number;
  marketplaceRevenue: number;
  lastOrderAt: string | null;
};

type Totals = { companies: number; activeBuyers: number; orders: number; revenue: number };

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n || 0);
}

export default function PartnerMarketplaceReferrals() {
  const [items, setItems] = React.useState<Referral[]>([]);
  const [totals, setTotals] = React.useState<Totals>({ companies: 0, activeBuyers: 0, orders: 0, revenue: 0 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/partner/marketplace/referrals", { credentials: "include" });
        const d = await res.json();
        if (d?.ok) {
          setItems(d.items as Referral[]);
          setTotals(d.totals as Totals);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <DashboardStatCard label="Referred companies" value={loading ? "…" : String(totals.companies)} />
        <DashboardStatCard label="Active buyers" value={loading ? "…" : String(totals.activeBuyers)} />
        <DashboardStatCard label="Marketplace orders" value={loading ? "…" : String(totals.orders)} />
        <DashboardStatCard label="Marketplace revenue" value={loading ? "…" : money(totals.revenue)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referred company marketplace activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead>Last order</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                    No referred companies yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((r) => (
                  <TableRow key={r.companyId}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      {r.email ? <div className="text-xs text-muted-foreground">{r.email}</div> : null}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{r.referralSource ?? "—"}</span>
                    </TableCell>
                    <TableCell className="text-right">{r.marketplaceOrders}</TableCell>
                    <TableCell className="text-right">{money(r.marketplaceRevenue)}</TableCell>
                    <TableCell>{r.lastOrderAt ? new Date(r.lastOrderAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.isActive ? "default" : "outline"}>{r.isActive ? "active" : "inactive"}</Badge>
                    </TableCell>
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
