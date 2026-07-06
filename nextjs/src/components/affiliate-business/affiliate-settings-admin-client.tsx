"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type SettingsForm = {
  defaultCommissionRate: number;
  cookieWindowDays: number;
  minimumPayout: number;
  autoApproveCommissions: boolean;
  notificationEmail: string;
  defaultLandingUrl: string;
  currency: string;
};

export function AffiliateSettingsAdminClient() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<SettingsForm>({
    defaultCommissionRate: 10,
    cookieWindowDays: 30,
    minimumPayout: 50,
    autoApproveCommissions: false,
    notificationEmail: "",
    defaultLandingUrl: "https://paperflight.demo",
    currency: "USD",
  });

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/affiliate-business/settings", { credentials: "include" });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          settings?: SettingsForm;
        };
        if (res.ok && data?.ok && data.settings) {
          setForm(data.settings);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/affiliate-business/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean };
      if (!res.ok || !data?.ok) {
        toast.error("Save failed");
        return;
      }
      toast.success("Settings saved");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Affiliate settings</CardTitle>
        <CardDescription>Defaults and notifications for your organization&apos;s affiliate program.</CardDescription>
      </CardHeader>
      <CardContent className="max-w-lg space-y-6">
        <div className="grid gap-2">
          <Label htmlFor="default-rate">Default commission rate (%)</Label>
          <Input
            id="default-rate"
            type="number"
            min={0}
            max={100}
            value={form.defaultCommissionRate}
            onChange={(e) =>
              setForm((f) => ({ ...f, defaultCommissionRate: Number(e.target.value) || 0 }))
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cookie-days">Attribution cookie window (days)</Label>
          <Input
            id="cookie-days"
            type="number"
            min={1}
            value={form.cookieWindowDays}
            onChange={(e) => setForm((f) => ({ ...f, cookieWindowDays: Number(e.target.value) || 30 }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="min-payout">Minimum payout amount</Label>
          <Input
            id="min-payout"
            type="number"
            min={0}
            value={form.minimumPayout}
            onChange={(e) => setForm((f) => ({ ...f, minimumPayout: Number(e.target.value) || 0 }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="landing-url">Default landing URL for affiliate links</Label>
          <Input
            id="landing-url"
            type="url"
            value={form.defaultLandingUrl}
            onChange={(e) => setForm((f) => ({ ...f, defaultLandingUrl: e.target.value }))}
            placeholder="https://yoursite.com"
          />
          <p className="text-xs text-muted-foreground">
            Used when generating tracking links unless a custom destination is set on the link.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="notify-email">Notification email</Label>
          <Input
            id="notify-email"
            type="email"
            value={form.notificationEmail}
            onChange={(e) => setForm((f) => ({ ...f, notificationEmail: e.target.value }))}
            placeholder="affiliates@yourcompany.com"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="currency">Currency code</Label>
          <Input
            id="currency"
            value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
            maxLength={8}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium text-sm">Auto-approve commissions</p>
            <p className="text-xs text-muted-foreground">
              New commissions are approved automatically without manual review.
            </p>
          </div>
          <Switch
            checked={form.autoApproveCommissions}
            onCheckedChange={(v) => setForm((f) => ({ ...f, autoApproveCommissions: v }))}
          />
        </div>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save settings
        </Button>
      </CardContent>
    </Card>
  );
}
