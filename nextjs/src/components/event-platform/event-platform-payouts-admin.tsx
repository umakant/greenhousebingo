"use client";

import * as React from "react";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type PayoutRow = {
  id: string;
  vendorName: string;
  totalAmount: string;
  currency: string;
  status: string;
  batchRef: string | null;
  createdAt: string;
};

type PendingVendor = {
  vendorId: string;
  vendorName: string;
  pendingAmount: string;
  entryCount: number;
};

export function EventPlatformPayoutsAdmin() {
  const { settings } = useAppSettings();
  const [items, setItems] = React.useState<PayoutRow[] | null>(null);
  const [pendingVendors, setPendingVendors] = React.useState<PendingVendor[]>([]);
  const [creating, setCreating] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    const res = await fetch("/api/event-platform/payouts", { credentials: "include" });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      items?: PayoutRow[];
      pendingVendors?: PendingVendor[];
    } | null;
    if (res.ok && data?.ok) {
      setItems(data.items ?? []);
      setPendingVendors(data.pendingVendors ?? []);
    } else {
      setItems([]);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function createBatch(vendorId: string) {
    setCreating(vendorId);
    try {
      const res = await fetch("/api/event-platform/payouts", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vendorId }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Failed to create batch.");
      toast.success("Payout batch created.");
      await reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create batch.");
    } finally {
      setCreating(null);
    }
  }

  if (items === null) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading payouts…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingVendors.length > 0 ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Pending commissions</CardTitle>
            <CardDescription>Create payout batches from pending vendor ledger entries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingVendors.map((v) => (
              <div key={v.vendorId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{v.vendorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.entryCount} entries · {formatCurrency(Number(v.pendingAmount), settings)} pending
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={creating === v.vendorId}
                  onClick={() => void createBatch(v.vendorId)}
                >
                  {creating === v.vendorId ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="mr-2 h-4 w-4" />
                  )}
                  Create batch
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No payout batches yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.vendorName}</TableCell>
                      <TableCell>{p.batchRef ?? "—"}</TableCell>
                      <TableCell>{formatCurrency(Number(p.totalAmount), settings)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
