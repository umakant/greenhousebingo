"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import MediaPicker from "@/components/MediaPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { EventPlatformMaintenanceSettings } from "@/lib/event-platform/event-platform-settings";

export function EventPlatformMaintenanceAdmin() {
  const [settings, setSettings] = React.useState<EventPlatformMaintenanceSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch("/api/event-platform/settings/maintenance", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; settings?: EventPlatformMaintenanceSettings } | null;
      if (res.ok && data?.ok && data.settings) setSettings(data.settings);
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/settings/maintenance", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enabled: settings.enabled,
          title: settings.title,
          message: settings.message,
          backgroundImage: settings.backgroundImage,
          estimatedReturnAt: settings.estimatedReturnAt,
          bypassPath: settings.bypassPath,
          allowedAdminRoutes: settings.allowedAdminRoutes,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Save failed.");
      toast.success("Maintenance settings saved.");
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
        <CardTitle>Maintenance mode</CardTitle>
        <CardDescription>Show a maintenance page on customer-facing event routes while admins keep access.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void save(e)} className="space-y-4">
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="maint-enabled">Enabled</Label>
            <Switch id="maint-enabled" checked={settings.enabled} onCheckedChange={(v) => setSettings({ ...settings, enabled: v })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maint-title">Title</Label>
            <Input id="maint-title" value={settings.title} onChange={(e) => setSettings({ ...settings, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maint-msg">Message</Label>
            <Textarea id="maint-msg" rows={4} value={settings.message} onChange={(e) => setSettings({ ...settings, message: e.target.value })} />
          </div>
          <MediaPicker label="Background image" value={settings.backgroundImage} onChange={(v) => setSettings({ ...settings, backgroundImage: typeof v === "string" ? v : v[0] ?? "" })} />
          <div className="space-y-1.5">
            <Label htmlFor="maint-return">Estimated return (ISO or text)</Label>
            <Input id="maint-return" value={settings.estimatedReturnAt} onChange={(e) => setSettings({ ...settings, estimatedReturnAt: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maint-bypass">Secret bypass path</Label>
            <Input id="maint-bypass" placeholder="e.g. preview-events" value={settings.bypassPath} onChange={(e) => setSettings({ ...settings, bypassPath: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maint-routes">Allowed admin route prefixes (comma-separated)</Label>
            <Input id="maint-routes" value={settings.allowedAdminRoutes} onChange={(e) => setSettings({ ...settings, allowedAdminRoutes: e.target.value })} />
          </div>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save maintenance settings"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
