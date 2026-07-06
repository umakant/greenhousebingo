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
  orderRef: string | null;
  amount: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
};

type Payout = {
  id: string;
  totalAmount: number;
  status: string;
  payoutReference: string | null;
  paidAt: string | null;
  createdAt: string;
};

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n || 0);
}

export default function PartnerCommission() {
  const [commissions, setCommissions] = React.useState<Commission[]>([]);
  const [payouts, setPayouts] = React.useState<Payout[]>([]);
  const [totals, setTotals] = React.useState({ earned: 0, pending: 0, paid: 0 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/partner/commission", { credentials: "include" });
        const d = await res.json();
        if (d?.ok) {
          setCommissions(d.commissions as Commission[]);
          setPayouts(d.payouts as Payout[]);
          setTotals(d.totals);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardStatCard label="Total earned" value={loading ? "…" : money(totals.earned)} />
        <DashboardStatCard label="Pending" value={loading ? "…" : money(totals.pending)} />
        <DashboardStatCard label="Paid" value={loading ? "…" : money(totals.paid)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Order amount</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : commissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                    No commissions yet.
                  </TableCell>
                </TableRow>
              ) : (
                commissions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <code className="text-xs">{c.orderRef ?? "—"}</code>
                    </TableCell>
                    <TableCell>{money(c.amount)}</TableCell>
                    <TableCell>{c.commissionRate}%</TableCell>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout history</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                    No payouts yet.
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{money(p.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "paid" ? "default" : "outline"}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>{p.payoutReference ?? "—"}</TableCell>
                    <TableCell>
                      {p.paidAt
                        ? new Date(p.paidAt).toLocaleDateString()
                        : new Date(p.createdAt).toLocaleDateString()}
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
