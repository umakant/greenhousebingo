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

type Commission = {
  id: string;
  companyId: string;
  companyName: string | null;
  orderRef: string | null;
  amount: number;
  commissionRate: number;
  commissionType: "percentage" | "flat";
  commissionAmount: number;
  status: string;
  createdAt: string;
};

type Totals = { earned: number; pending: number; paid: number; count: number };

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n || 0);
}

export default function PartnerMarketplaceCommissions() {
  const [commissions, setCommissions] = React.useState<Commission[]>([]);
  const [totals, setTotals] = React.useState<Totals>({ earned: 0, pending: 0, paid: 0, count: 0 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/partner/marketplace/commissions", { credentials: "include" });
        const d = await res.json();
        if (d?.ok) {
          setCommissions(d.commissions as Commission[]);
          setTotals(d.totals as Totals);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardStatCard label="Marketplace earned" value={loading ? "…" : money(totals.earned)} />
        <DashboardStatCard label="Pending" value={loading ? "…" : money(totals.pending)} />
        <DashboardStatCard label="Paid" value={loading ? "…" : money(totals.paid)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Marketplace commissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Order amount</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-16 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : commissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
                    No marketplace commissions yet.
                  </TableCell>
                </TableRow>
              ) : (
                commissions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <code className="text-xs">{c.orderRef ?? "—"}</code>
                    </TableCell>
                    <TableCell>{c.companyName ?? "—"}</TableCell>
                    <TableCell>{money(c.amount)}</TableCell>
                    <TableCell>
                      {c.commissionType === "flat" ? (
                        <Badge variant="secondary">Flat</Badge>
                      ) : (
                        <span>{c.commissionRate}%</span>
                      )}
                    </TableCell>
                    <TableCell>{money(c.commissionAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "paid" ? "default" : "outline"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
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
