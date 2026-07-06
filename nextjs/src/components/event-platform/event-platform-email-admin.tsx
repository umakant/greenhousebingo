"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { EventPlatformEmailSettings } from "@/lib/event-platform/event-platform-settings";

export function EventPlatformEmailAdmin() {
  const [settings, setSettings] = React.useState<EventPlatformEmailSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch("/api/event-platform/settings/email", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        settings?: EventPlatformEmailSettings;
      } | null;
      if (res.ok && data?.ok && data.settings) setSettings(data.settings);
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/settings/email", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Save failed.");
      toast.success("Email settings saved.");
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
    <div className="space-y-4">
      <Card className="max-w-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Email delivery</CardTitle>
          <CardDescription>
            Configure SMTP for event notifications. When &quot;Use global SMTP&quot; is on, tenant-wide
            email settings apply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void save(e)} className="grid gap-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Use global SMTP</p>
                <p className="text-xs text-muted-foreground">From Settings → Email</p>
              </div>
              <Switch
                checked={settings.useGlobalSmtp}
                onCheckedChange={(v) => setSettings({ ...settings, useGlobalSmtp: v })}
              />
            </div>
            {!settings.useGlobalSmtp ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>From name</Label>
                    <Input
                      value={settings.fromName}
                      onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>From address</Label>
                    <Input
                      type="email"
                      value={settings.fromAddress}
                      onChange={(e) => setSettings({ ...settings, fromAddress: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Reply-to</Label>
                  <Input
                    type="email"
                    value={settings.replyTo}
                    onChange={(e) => setSettings({ ...settings, replyTo: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>SMTP host</Label>
                    <Input
                      value={settings.smtpHost}
                      onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Port</Label>
                    <Input
                      value={settings.smtpPort}
                      onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Encryption</Label>
                    <Input
                      value={settings.smtpEncryption}
                      onChange={(e) => setSettings({ ...settings, smtpEncryption: e.target.value })}
                      placeholder="tls"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Username</Label>
                    <Input
                      value={settings.smtpUser}
                      onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={settings.smtpPassword}
                    onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                  />
                </div>
              </>
            ) : null}
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save email settings
            </Button>
          </form>
        </CardContent>
      </Card>
      <Button variant="outline" asChild>
        <Link href="/admin/event-platform/email/templates">Manage email templates →</Link>
      </Button>
    </div>
  );
}
