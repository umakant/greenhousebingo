"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaymentGatewayConfig } from "@/lib/event-platform/event-platform-settings";

export function EventPlatformPaymentsOnlineAdmin() {
  const [items, setItems] = React.useState<PaymentGatewayConfig[] | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch("/api/event-platform/settings/payments", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: PaymentGatewayConfig[] } | null;
      setItems(res.ok && data?.ok ? data.items ?? [] : []);
    })();
  }, []);

  function patch(id: string, patch: Partial<PaymentGatewayConfig>) {
    setItems((prev) => (prev ?? []).map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  async function save() {
    if (!items) return;
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/settings/payments", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Save failed.");
      toast.success("Payment gateways saved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (items === null) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {items.map((g) => (
        <Card key={g.id} className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{g.label}</CardTitle>
            <Switch checked={g.enabled} onCheckedChange={(v) => patch(g.id, { enabled: v })} />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select value={g.mode} onValueChange={(v) => patch(g.id, { mode: v as "test" | "live" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Public key</Label>
              <Input value={g.publicKey} onChange={(e) => patch(g.id, { publicKey: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Secret key</Label>
              <Input type="password" value={g.secretKey} onChange={(e) => patch(g.id, { secretKey: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Webhook secret</Label>
              <Input type="password" value={g.webhookSecret} onChange={(e) => patch(g.id, { webhookSecret: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      ))}
      <Button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save gateways"}</Button>
    </div>
  );
}
