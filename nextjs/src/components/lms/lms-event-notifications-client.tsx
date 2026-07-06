"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { EventEmptyState } from "@/components/lms/events/event-empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LmsEventNotification } from "@/lib/lms-events/types";
import { cn } from "@/lib/utils";

export function LmsEventNotificationsClient() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [notifications, setNotifications] = React.useState<LmsEventNotification[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/lms/event-notifications", { credentials: "include", cache: "no-store" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        notifications?: LmsEventNotification[];
      } | null;
      if (cancelled) return;
      if (!res.ok || !data?.ok) {
        setErr(data?.message ?? "Could not load notifications.");
        setLoading(false);
        return;
      }
      setNotifications(data.notifications ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading notifications…
      </div>
    );
  }

  if (err) return <p className="text-sm text-destructive">{err}</p>;

  if (notifications.length === 0) {
    return (
      <EventEmptyState
        title="No notifications"
        description="Updates about your event registrations will appear here."
        actionHref="/lms/my-events"
        actionLabel="My events"
      />
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((n) => (
        <Card key={n.id} className={cn(!n.readAt && "border-primary/30 bg-primary/5")}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">{n.title}</CardTitle>
            {!n.readAt ? <Badge variant="default">New</Badge> : null}
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">{n.body}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(n.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
