"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EventPlatformAppearanceSettings } from "@/lib/event-platform/event-platform-settings";

export function EventPlatformAppearanceAdmin() {
  const [settings, setSettings] = React.useState<EventPlatformAppearanceSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch("/api/event-platform/settings/appearance", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        settings?: EventPlatformAppearanceSettings;
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
      const res = await fetch("/api/event-platform/settings/appearance", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Save failed.");
      toast.success("Appearance settings saved.");
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
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Branding for the event marketplace and learner event pages.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void save(e)} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ep-primary">Primary color</Label>
              <Input
                id="ep-primary"
                type="color"
                value={settings.primaryColor.startsWith("#") ? settings.primaryColor : "#dc2626"}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-secondary">Secondary color</Label>
              <Input
                id="ep-secondary"
                type="color"
                value={settings.secondaryColor.startsWith("#") ? settings.secondaryColor : "#1e293b"}
                onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-logo">Logo URL</Label>
            <Input
              id="ep-logo"
              value={settings.logoUrl}
              onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-favicon">Favicon URL</Label>
            <Input
              id="ep-favicon"
              value={settings.faviconUrl}
              onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-font">Font family</Label>
            <Input
              id="ep-font"
              value={settings.fontFamily}
              onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
              placeholder="Inter, system-ui, sans-serif"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-header">Header HTML</Label>
            <Textarea
              id="ep-header"
              rows={3}
              value={settings.headerHtml}
              onChange={(e) => setSettings({ ...settings, headerHtml: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-footer">Footer HTML</Label>
            <Textarea
              id="ep-footer"
              rows={3}
              value={settings.footerHtml}
              onChange={(e) => setSettings({ ...settings, footerHtml: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save appearance
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
