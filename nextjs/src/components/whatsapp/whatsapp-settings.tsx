"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface EventNotification {
  id: string;
  event: string;
  label: string;
  isEnabled: boolean;
  template: string | null;
}

interface Settings {
  provider: string;
  account_sid: string;
  auth_token: string;
  from_number: string;
}

export function WhatsAppSettings() {
  const [settings, setSettings] = useState<Settings>({
    provider: "twilio",
    account_sid: "",
    auth_token: "",
    from_number: "",
  });
  const [events, setEvents] = useState<EventNotification[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchEvents();
  }, []);

  async function fetchSettings() {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/whatsapp/settings");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSettings((prev) => ({ ...prev, ...data }));
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoadingSettings(false);
    }
  }

  async function fetchEvents() {
    setLoadingEvents(true);
    try {
      const res = await fetch("/api/whatsapp/events");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEvents(data);
    } catch {
      toast.error("Failed to load event notifications");
    } finally {
      setLoadingEvents(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/whatsapp/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  async function toggleEvent(event: EventNotification) {
    const updated = { ...event, isEnabled: !event.isEnabled };
    setEvents((prev) => prev.map((e) => (e.event === event.event ? updated : e)));
    try {
      const res = await fetch("/api/whatsapp/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: event.event, isEnabled: updated.isEnabled, template: event.template }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Event notification ${updated.isEnabled ? "enabled" : "disabled"}`);
    } catch {
      setEvents((prev) => prev.map((e) => (e.event === event.event ? event : e)));
      toast.error("Failed to update event");
    }
  }

  async function saveTemplate(event: EventNotification, template: string) {
    try {
      const res = await fetch("/api/whatsapp/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: event.event, isEnabled: event.isEnabled, template }),
      });
      if (!res.ok) throw new Error();
      toast.success("Template saved");
    } catch {
      toast.error("Failed to save template");
    }
  }

  return (
    <div className="space-y-6">
      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">WhatsApp API Configuration</CardTitle>
          <CardDescription>
            Configure your Twilio or WhatsApp Business API credentials to enable message sending.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSettings ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading settings...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Provider</Label>
                  <Input
                    value={settings.provider}
                    onChange={(e) => setSettings((p) => ({ ...p, provider: e.target.value }))}
                    placeholder="twilio"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">From Number</Label>
                  <Input
                    value={settings.from_number}
                    onChange={(e) => setSettings((p) => ({ ...p, from_number: e.target.value }))}
                    placeholder="+1234567890"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Account SID</Label>
                  <Input
                    value={settings.account_sid}
                    onChange={(e) => setSettings((p) => ({ ...p, account_sid: e.target.value }))}
                    placeholder="AC..."
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Auth Token</Label>
                  <Input
                    type="password"
                    value={settings.auth_token}
                    onChange={(e) => setSettings((p) => ({ ...p, auth_token: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={saveSettings} disabled={savingSettings} className="gap-2">
                  {savingSettings ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Settings
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Event Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event Notifications</CardTitle>
          <CardDescription>
            Control which application events trigger WhatsApp messages. Toggle events on or off and customize message templates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingEvents ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading events...
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.event} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{event.label}</p>
                      <p className="text-xs text-muted-foreground font-mono">{event.event}</p>
                    </div>
                    <Switch
                      checked={event.isEnabled}
                      onCheckedChange={() => toggleEvent(event)}
                    />
                  </div>

                  {event.isEnabled && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Message Template (optional)
                      </Label>
                      <Textarea
                        placeholder="e.g. Hello {name}, your invoice #{invoice_id} has been created."
                        defaultValue={event.template || ""}
                        rows={2}
                        className="text-sm"
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val !== (event.template || "")) {
                            saveTemplate(event, val);
                            setEvents((prev) =>
                              prev.map((ev) =>
                                ev.event === event.event ? { ...ev, template: val } : ev
                              )
                            );
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
