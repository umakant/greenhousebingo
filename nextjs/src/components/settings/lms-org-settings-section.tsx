"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Props = {
  canEdit: boolean;
};

export function LmsOrgSettingsSection({ canEdit }: Props) {
  const [enabled, setEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/lms/org-enabled", { credentials: "same-origin", cache: "no-store" });
        const json = (await res.json()) as { ok?: boolean; enabled?: boolean; message?: string };
        if (!res.ok || !json?.ok) throw new Error(json?.message ?? "Failed to load LMS status.");
        if (!cancelled) setEnabled(Boolean(json.enabled));
      } catch (e: unknown) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load LMS status.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function persist(next: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/lms/org-enabled", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json?.ok) throw new Error(json?.message ?? "Failed to update LMS.");
      setEnabled(next);
      toast.success(next ? "LMS enabled for this organization." : "LMS disabled for this organization.");
      void fetch("/api/auth/me", { credentials: "same-origin" }).catch(() => null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update LMS.");
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>LMS for this organization</CardTitle>
        <CardDescription>
          Turn the Learning Management System on or off for your company. Users need the LMS add-on on their plan and the
          add-on enabled globally by the platform administrator.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label htmlFor="lms-org-enabled">Enable LMS</Label>
              <p className="text-xs text-muted-foreground">
                When disabled, the LMS menu and routes are hidden for your organization. New organizations default to enabled
                if LMS is on the plan and enabled globally.
              </p>
            </div>
            <Switch
              id="lms-org-enabled"
              checked={enabled}
              disabled={!canEdit || saving}
              onCheckedChange={(v) => {
                if (!canEdit) return;
                void persist(v);
              }}
            />
          </div>
        )}
        {!canEdit ? (
          <p className="text-xs text-muted-foreground">You do not have permission to change this setting.</p>
        ) : null}
        {canEdit ? (
          <Button type="button" variant="outline" size="sm" disabled={saving} asChild>
            <a href="/lms/dashboard">Open LMS dashboard</a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
