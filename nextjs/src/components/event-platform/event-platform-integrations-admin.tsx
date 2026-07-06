"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { EventPlatformIntegrationsSettings } from "@/lib/event-platform/event-platform-settings";

function IntegrationBlock(props: {
  title: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  fields: { label: string; value: string; onChange: (v: string) => void; type?: string }[];
}) {
  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{props.title}</h3>
        <Switch checked={props.enabled} onCheckedChange={props.onEnabledChange} />
      </div>
      {props.fields.map((f) => (
        <div key={f.label} className="space-y-1.5">
          <Label>{f.label}</Label>
          <Input type={f.type ?? "text"} value={f.value} onChange={(e) => f.onChange(e.target.value)} />
        </div>
      ))}
    </div>
  );
}

export function EventPlatformIntegrationsAdmin() {
  const [settings, setSettings] = React.useState<EventPlatformIntegrationsSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch("/api/event-platform/settings/integrations", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; settings?: EventPlatformIntegrationsSettings } | null;
      if (res.ok && data?.ok && data.settings) setSettings(data.settings);
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/settings/integrations", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Save failed.");
      toast.success("Integration settings saved.");
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
    <form onSubmit={(e) => void save(e)} className="max-w-2xl space-y-4">
      <IntegrationBlock
        title="OpenAI"
        enabled={settings.openaiEnabled}
        onEnabledChange={(v) => setSettings({ ...settings, openaiEnabled: v })}
        fields={[{ label: "API key", value: settings.openaiKey, onChange: (v) => setSettings({ ...settings, openaiKey: v }), type: "password" }]}
      />
      <IntegrationBlock
        title="Gemini"
        enabled={settings.geminiEnabled}
        onEnabledChange={(v) => setSettings({ ...settings, geminiEnabled: v })}
        fields={[{ label: "API key", value: settings.geminiKey, onChange: (v) => setSettings({ ...settings, geminiKey: v }), type: "password" }]}
      />
      <IntegrationBlock
        title="Stripe"
        enabled={settings.stripeEnabled}
        onEnabledChange={(v) => setSettings({ ...settings, stripeEnabled: v })}
        fields={[
          { label: "Publishable key", value: settings.stripePublicKey, onChange: (v) => setSettings({ ...settings, stripePublicKey: v }) },
          { label: "Secret key", value: settings.stripeSecretKey, onChange: (v) => setSettings({ ...settings, stripeSecretKey: v }), type: "password" },
        ]}
      />
      <IntegrationBlock
        title="Twilio"
        enabled={settings.twilioEnabled}
        onEnabledChange={(v) => setSettings({ ...settings, twilioEnabled: v })}
        fields={[
          { label: "Account SID", value: settings.twilioSid, onChange: (v) => setSettings({ ...settings, twilioSid: v }) },
          { label: "Auth token", value: settings.twilioToken, onChange: (v) => setSettings({ ...settings, twilioToken: v }), type: "password" },
        ]}
      />
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Google Maps</CardTitle>
          <CardDescription>Used for venue maps on event detail pages.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label>API key</Label>
            <Input value={settings.googleMapsKey} onChange={(e) => setSettings({ ...settings, googleMapsKey: e.target.value })} />
          </div>
        </CardContent>
      </Card>
      <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save integrations"}</Button>
    </form>
  );
}
