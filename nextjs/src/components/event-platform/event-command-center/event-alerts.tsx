"use client";

import * as React from "react";
import { AlertTriangle, Info, Loader2, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";

import { useEventCommandCenter } from "@/components/event-platform/event-command-center/event-command-center-context";
import type { EventCommandTabId } from "@/components/event-platform/event-command-center/event-command-center-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CommandCenterAlert } from "@/lib/event-platform/command-center/command-center-types";
import { cn } from "@/lib/utils";

function alertIcon(severity: CommandCenterAlert["severity"]) {
  if (severity === "critical") return ShieldAlert;
  if (severity === "warning") return AlertTriangle;
  return Info;
}

function tabForActionKind(kind: CommandCenterAlert["actionKind"]): EventCommandTabId | null {
  if (kind === "check_in") return "attendees";
  if (kind === "hosts") return "venue-host";
  if (kind === "games") return "games";
  if (kind === "financials") return "financials";
  if (kind === "edit") return "overview";
  return null;
}

type EventAlertsProps = {
  eventId: string;
  onTabChange?: (tab: EventCommandTabId) => void;
};

export function EventAlerts(props: EventAlertsProps) {
  const { summary, reloadSummary } = useEventCommandCenter();
  const [dismissing, setDismissing] = React.useState<string | null>(null);

  const alerts = summary?.alerts ?? [];

  if (!alerts.length) return null;

  async function dismissAlert(alertKey: string) {
    setDismissing(alertKey);
    const res = await fetch(
      `/api/event-platform/events/${encodeURIComponent(props.eventId)}/operations/actions`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss_alert", alertKey }),
      },
    );
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
    setDismissing(null);
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not dismiss alert.");
      return;
    }
    await reloadSummary();
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {alerts.map((alert) => {
        const Icon = alertIcon(alert.severity);
        const tab = tabForActionKind(alert.actionKind);
        return (
          <Card
            key={alert.id}
            className={cn(
              "shadow-sm border",
              alert.severity === "critical" && "border-red-200 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/20",
              alert.severity === "warning" && "border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/20",
              alert.severity === "info" && "border-sky-200 bg-sky-50/80 dark:border-sky-900/50 dark:bg-sky-950/20",
            )}
          >
            <CardContent className="flex flex-wrap items-start gap-3 p-4">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="text-sm text-muted-foreground">{alert.explanation ?? alert.message}</p>
                {(alert.recommendedAction ?? alert.actionLabel) && tab && props.onTabChange ? (
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => props.onTabChange!(tab)}
                  >
                    {alert.recommendedAction ?? alert.actionLabel}
                  </Button>
                ) : null}
              </div>
              {alert.dismissible ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={dismissing === alert.id}
                  onClick={() => void dismissAlert(alert.id)}
                >
                  {dismissing === alert.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  <span className="sr-only">Dismiss</span>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
