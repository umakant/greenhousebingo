"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Payout = {
  id: string;
  partnerId: string;
  partnerName: string;
  totalAmount: number;
  status: string;
  payoutMethod: string | null;
  payoutReference: string | null;
  paidAt: string | null;
  createdAt: string;
};

type PayablePartner = {
  id: string;
  name: string;
  payoutMethod: string | null;
  pendingAmount: number;
};

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n || 0);
}

export default function PayoutsAdmin() {
  const [payouts, setPayouts] = React.useState<Payout[]>([]);
  const [payable, setPayable] = React.useState<PayablePartner[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refInputs, setRefInputs] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partnerships/payouts", { credentials: "include" });
      const d = await res.json();
      if (d?.ok) {
        setPayouts(d.items as Payout[]);
        setPayable(d.payablePartners as PayablePartner[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const createPayout = async (partnerId: string) => {
    const res = await fetch("/api/partnerships/payouts", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      toast.success("Payout created");
      void load();
    } else {
      toast.error(d?.message ?? "Create failed");
    }
  };

  const markPaid = async (payout: Payout) => {
    const res = await fetch(`/api/partnerships/payouts/${payout.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid", payoutReference: refInputs[payout.id] ?? "" }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      toast.success("Payout marked paid");
      void load();
    } else {
      toast.error(d?.message ?? "Update failed");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Partners with unpaid commissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Pending amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payable.filter((p) => p.pendingAmount > 0).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                    No pending commissions.
                  </TableCell>
                </TableRow>
              ) : (
                payable
                  .filter((p) => p.pendingAmount > 0)
                  .map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.payoutMethod ?? "—"}</TableCell>
                      <TableCell>{money(p.pendingAmount)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => void createPayout(p.id)}>
                          Create payout
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                    No payouts yet.
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.partnerName}</TableCell>
                    <TableCell>{money(p.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "paid" ? "default" : "outline"}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.status === "paid" ? (
                        p.payoutReference ?? "—"
                      ) : (
                        <Input
                          className="w-40"
                          placeholder="Reference"
                          value={refInputs[p.id] ?? ""}
                          onChange={(e) => setRefInputs((s) => ({ ...s, [p.id]: e.target.value }))}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.status !== "paid" ? (
                        <Button size="sm" variant="outline" onClick={() => void markPaid(p)}>
                          Mark paid
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : ""}
                        </span>
                      )}
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
