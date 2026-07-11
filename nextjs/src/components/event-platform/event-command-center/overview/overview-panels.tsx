"use client";

import * as React from "react";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

import { MetricValue, availabilityBadgeClass, metricSublabel } from "@/components/event-platform/event-command-center/metric-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CommandCenterAlert, CommandCenterHealth } from "@/lib/event-platform/command-center/command-center-types";
import { cn } from "@/lib/utils";

function healthRingClass(status: CommandCenterHealth["status"]) {
  if (status === "excellent") return "text-emerald-600 dark:text-emerald-400";
  if (status === "on_track") return "text-sky-600 dark:text-sky-400";
  if (status === "needs_attention") return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function EventHealthScore(props: { health: CommandCenterHealth | null }) {
  if (!props.health) return null;
  const { health } = props;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Event health score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className={cn("text-4xl font-bold tabular-nums", healthRingClass(health.status))}>
            {health.score}
          </div>
          <div>
            <Badge variant="secondary" className={cn("border-0", availabilityBadgeClass("available"))}>
              {health.statusLabel}
            </Badge>
            <p className="mt-1 text-xs text-muted-foreground">{health.recommendedAction}</p>
          </div>
        </div>

        <div className="space-y-3">
          {health.factors.map((factor) => {
            const pct = factor.max > 0 ? Math.round((factor.earned / factor.max) * 100) : 0;
            return (
              <div key={factor.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">
                    {factor.label}
                    <span className="ml-1 text-muted-foreground">({factor.weight} pts)</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {factor.availability === "not_configured" ? "—" : `${factor.earned}/${factor.max}`}
                  </span>
                </div>
                <Progress
                  value={factor.availability === "not_configured" ? 0 : pct}
                  className={cn(factor.availability === "not_configured" && "opacity-50")}
                />
                <p className="text-xs text-muted-foreground">{factor.detail}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function alertIcon(severity: CommandCenterAlert["severity"]) {
  if (severity === "critical") return ShieldAlert;
  if (severity === "warning") return AlertTriangle;
  return Info;
}

export function OperationalAlertsPanel(props: {
  alerts: CommandCenterAlert[];
  onAction: (alert: CommandCenterAlert) => void;
}) {
  if (!props.alerts.length) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Operational alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active alerts. Event operations look clear.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Operational alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.alerts.map((alert) => {
          const Icon = alertIcon(alert.severity);
          return (
            <div
              key={alert.id}
              className={cn(
                "rounded-lg border p-3",
                alert.severity === "critical" && "border-red-200 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/20",
                alert.severity === "warning" && "border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/20",
                alert.severity === "info" && "border-sky-200 bg-sky-50/80 dark:border-sky-900/50 dark:bg-sky-950/20",
              )}
            >
              <div className="flex gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className="text-sm font-semibold">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                  </div>
                  {alert.actionKind !== "none" ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => props.onAction(alert)}>
                      {alert.actionLabel}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function EventTimelinePanel(props: {
  items: Array<{ id: string; label: string; time: string | null; status: string }>;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Upcoming timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-4 border-l border-muted pl-4">
          {props.items.map((item) => (
            <li key={item.id} className="relative">
              <span
                className={cn(
                  "absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 bg-background",
                  item.status === "past" && "border-muted-foreground/40",
                  item.status === "current" && "border-primary bg-primary",
                  item.status === "upcoming" && "border-primary",
                  item.status === "unknown" && "border-dashed border-muted-foreground/50",
                )}
              />
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">
                {item.time
                  ? new Date(item.time).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Time TBD"}
                {item.status === "past" ? " · Past" : item.status === "upcoming" ? " · Upcoming" : ""}
              </p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export function RecentActivityPanel(props: {
  items: Array<{ id: string; at: string; title: string; detail: string }>;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {props.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity recorded.</p>
        ) : (
          <ul className="space-y-3">
            {props.items.map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5 border-b border-muted/60 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function OverviewQuickActions(props: {
  onEdit: () => void;
  onCheckIn: () => void;
}) {
  const actions = [
    { label: "Add attendee", soon: true },
    { label: "Open check-in", onClick: props.onCheckIn },
    { label: "Sell bonus cards", soon: true },
    { label: "Add expense", soon: true },
    { label: "Add plant", soon: true },
    { label: "Add game", soon: true },
    { label: "Record winner", soon: true },
    { label: "Send announcement", soon: true },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            type="button"
            size="sm"
            variant="outline"
            onClick={action.onClick ?? (() => {})}
            disabled={action.soon && !action.onClick}
            title={action.soon ? "Coming soon" : undefined}
          >
            {action.label}
          </Button>
        ))}
        <Button type="button" size="sm" variant="secondary" onClick={props.onEdit}>
          Edit event
        </Button>
      </CardContent>
    </Card>
  );
}

export { MetricValue, metricSublabel };
