"use client";

import * as React from "react";
import { Clock, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { t } from "@/lib/admin-t";


const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type HourEntry = { id?: string; dayName: string; startTime: string; endTime: string; dayOff: boolean };

const defaultHours = (): HourEntry[] => DAYS.map(d => ({
  dayName: d,
  startTime: "09:00",
  endTime: "17:00",
  dayOff: d === "Saturday" || d === "Sunday",
}));

export default function AppointmentSetupAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-appointment");
  const [hours, setHours] = React.useState<HourEntry[]>(defaultHours());
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const hRes = await fetch("/api/appointment/hours", { cache: "no-store" });
      if (hRes.ok) {
        const hData = await hRes.json();
        if (hData.data && hData.data.length > 0) {
          const merged = defaultHours().map(def => {
            const found = hData.data.find((h: any) => h.dayName === def.dayName);
            return found ? { ...def, id: found.id, startTime: found.startTime ?? "09:00", endTime: found.endTime ?? "17:00", dayOff: found.dayOff } : def;
          });
          setHours(merged);
        }
      }
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  React.useEffect(() => { void load(); }, []); // eslint-disable-line

  function updateHour(day: string, field: keyof HourEntry, value: any) {
    setHours(prev => prev.map(h => h.dayName === day ? { ...h, [field]: value } : h));
  }

  async function saveHours() {
    setSaving(true); setError(null); setSuccess(null);
    try {
      const body = { hours: hours.map(h => ({ day_name: h.dayName, start_time: h.dayOff ? null : h.startTime, end_time: h.dayOff ? null : h.endTime, day_off: h.dayOff })) };
      const res = await fetch("/api/appointment/hours", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Save failed");
      setSuccess(t("Business hours saved successfully."));
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  const canSaveHours = can("manage-appointment-hours");

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">{t("Loading...")}</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5 shrink-0" />
              {t("System Setup")}
            </CardTitle>
            <CardDescription className="mt-1">
              {t("Configure business hours for your appointment module.")}
            </CardDescription>
          </div>
          {canSaveHours ? (
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              disabled={saving}
              onClick={() => void saveHours()}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? t("Saving...") : t("Save Hours")}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
          {success ? <div className="rounded-md border border-green-400/40 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div> : null}

          <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t("Configure Business Hours")}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{t("Set opening hours for each day. Mark days as off when you are closed.")}</p>
            </div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void saveHours();
              }}
            >
              <div className="grid gap-3">
                {hours.map(h => (
                  <div key={h.dayName} className="grid grid-cols-1 sm:grid-cols-[120px_1fr_1fr_auto] items-start sm:items-center gap-3 py-3 border-b last:border-0">
                    <div className="font-medium text-sm pt-2 sm:pt-0">{h.dayName}</div>
                    <Input type="time" value={h.startTime} disabled={h.dayOff} onChange={e => updateHour(h.dayName, "startTime", e.target.value)} className="text-sm" />
                    <Input type="time" value={h.endTime} disabled={h.dayOff} onChange={e => updateHour(h.dayName, "endTime", e.target.value)} className="text-sm" />
                    <div className="flex items-center gap-2">
                      <Switch checked={h.dayOff} onCheckedChange={v => updateHour(h.dayName, "dayOff", v)} id={`dayoff_${h.dayName}`} />
                      <Label htmlFor={`dayoff_${h.dayName}`} className="text-xs text-muted-foreground whitespace-nowrap">{t("Day Off")}</Label>
                    </div>
                  </div>
                ))}
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
