"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EventPlatformCurrencySettings } from "@/lib/event-platform/event-platform-settings";

export function EventPlatformCurrencyAdmin() {
  const [settings, setSettings] = React.useState<EventPlatformCurrencySettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch("/api/event-platform/settings/currency", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; settings?: EventPlatformCurrencySettings } | null;
      if (res.ok && data?.ok && data.settings) setSettings(data.settings);
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/settings/currency", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Save failed.");
      toast.success("Currency settings saved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <Card className="max-w-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Currency</CardTitle>
        <CardDescription>Default currency for event tickets, commissions, and payouts.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void save(e)} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ccy-code">Currency code</Label>
            <Input id="ccy-code" value={settings.currencyCode} onChange={(e) => setSettings({ ...settings, currencyCode: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ccy-symbol">Symbol</Label>
            <Input id="ccy-symbol" value={settings.currencySymbol} onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ccy-rate">Exchange rate (vs USD)</Label>
            <Input id="ccy-rate" inputMode="decimal" value={String(settings.exchangeRate)} onChange={(e) => setSettings({ ...settings, exchangeRate: Number(e.target.value) || 1 })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ccy-decimals">Decimal places</Label>
            <Input id="ccy-decimals" type="number" min={0} max={4} value={settings.decimalPlaces} onChange={(e) => setSettings({ ...settings, decimalPlaces: Number(e.target.value) || 0 })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ccy-thousand">Thousand separator</Label>
            <Input id="ccy-thousand" value={settings.thousandSeparator} onChange={(e) => setSettings({ ...settings, thousandSeparator: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ccy-decimal">Decimal separator</Label>
            <Input id="ccy-decimal" value={settings.decimalSeparator} onChange={(e) => setSettings({ ...settings, decimalSeparator: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Symbol position</Label>
            <Select value={settings.currencyPosition} onValueChange={(v) => setSettings({ ...settings, currencyPosition: v as "before" | "after" })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before">Before amount ($100)</SelectItem>
                <SelectItem value="after">After amount (100$)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save currency settings"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
