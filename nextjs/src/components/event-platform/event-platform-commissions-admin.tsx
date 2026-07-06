"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CommissionLedgerDto } from "@/lib/event-platform/commissions/ledger-service";

export function EventPlatformCommissionsAdmin() {
  const [rate, setRate] = React.useState("");
  const [ledger, setLedger] = React.useState<CommissionLedgerDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const [settingsRes, ledgerRes] = await Promise.all([
        fetch("/api/event-platform/commissions/settings", { credentials: "include" }),
        fetch("/api/event-platform/commissions/ledger", { credentials: "include" }),
      ]);
      const settingsData = (await settingsRes.json().catch(() => null)) as { ok?: boolean; globalCommissionRate?: number } | null;
      const ledgerData = (await ledgerRes.json().catch(() => null)) as { ok?: boolean; items?: CommissionLedgerDto[] } | null;
      if (settingsRes.ok && settingsData?.ok) setRate(String(settingsData.globalCommissionRate ?? 10));
      if (ledgerRes.ok && ledgerData?.ok) setLedger(ledgerData.items ?? []);
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/commissions/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ globalCommissionRate: Number(rate) }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Save failed.");
      toast.success("Commission settings saved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-lg shadow-sm">
        <CardHeader>
          <CardTitle>Global commission</CardTitle>
          <CardDescription>
            Default platform commission percentage applied to vendor sales when no vendor or event override is set.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void save(e)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="global-rate">Commission rate (%)</Label>
              <Input id="global-rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Commission ledger</CardTitle>
          <CardDescription>Pending and paid commission entries from event bookings.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {ledger.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No ledger entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Vendor net</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.vendorName}</TableCell>
                      <TableCell>{row.grossAmount} {row.currency}</TableCell>
                      <TableCell>{row.platformCommission}</TableCell>
                      <TableCell>{row.vendorNet}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{row.status}</Badge>
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
