"use client";

import * as React from "react";
import { Ticket } from "lucide-react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Props = {
  companyId: string;
  initialEnabled: boolean;
};

export function CompanyEventPlatformOrgCard({ companyId, initialEnabled }: Props) {
  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [saving, setSaving] = React.useState(false);

  async function persist(next: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/event-platform/org-enabled", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId: companyId, enabled: next }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json?.ok) throw new Error(json?.message ?? "Failed to update Event Platform.");
      setEnabled(next);
      toast.success(
        next ? "Event Platform enabled for this company." : "Event Platform disabled for this company.",
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update Event Platform.");
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background">
            <Ticket className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <div className="font-medium leading-snug">Event Platform add-on (organization)</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Controls whether this company can use Event Platform, in addition to plan and global add-on settings.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex items-center gap-2 sm:justify-end">
            <Label htmlFor={`event-platform-org-${companyId}`} className="text-xs text-muted-foreground">
              Enabled
            </Label>
            <Switch
              id={`event-platform-org-${companyId}`}
              checked={enabled}
              disabled={saving}
              onCheckedChange={(v) => {
                void persist(v);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
