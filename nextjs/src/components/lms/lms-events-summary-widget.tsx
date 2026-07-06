"use client";

import * as React from "react";
import Link from "next/link";
import { Award, Bell, Calendar, ChevronRight, Loader2, Ticket } from "lucide-react";

import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type LmsEventsSummaryPayload = {
  upcomingEventCount: number;
  registeredCount: number;
  certificateCount: number;
  unreadNotifications: number;
  upcoming: Array<{ eventId: string; title: string; startsAt: string; href: string }>;
};

export function useLmsEventsSummary() {
  const [loading, setLoading] = React.useState(true);
  const [summary, setSummary] = React.useState<LmsEventsSummaryPayload | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/lms/events/summary", { credentials: "include", cache: "no-store" });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; summary?: LmsEventsSummaryPayload } | null;
        if (!cancelled && res.ok && data?.ok && data.summary) {
          setSummary(data.summary);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, summary };
}

function formatEventDate(iso: string): { month: string; day: string } {
  const d = new Date(iso);
  return {
    month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    day: String(d.getDate()).padStart(2, "0"),
  };
}

export function LmsEventsSummaryStats(props: { summary: LmsEventsSummaryPayload; className?: string }) {
  const { summary } = props;
  return (
    <div className={props.className}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DashboardStatCard
          label="Registered Events"
          value={summary.registeredCount}
          sub="Your event bookings"
          icon={<Ticket className="h-8 w-8" />}
          href="/lms/my-events"
        />
        <DashboardStatCard
          label="Upcoming Events"
          value={summary.upcomingEventCount}
          sub="On your calendar"
          icon={<Calendar className="h-8 w-8" />}
          href="/lms/my-events"
        />
        <DashboardStatCard
          label="Event Certificates"
          value={summary.certificateCount}
          sub="Training credentials"
          icon={<Award className="h-8 w-8" />}
          href="/lms/certificates"
        />
        <DashboardStatCard
          label="Notifications"
          value={summary.unreadNotifications}
          sub="Unread updates"
          icon={<Bell className="h-8 w-8" />}
          href="/lms/notifications"
        />
      </div>
    </div>
  );
}

export function LmsEventsUpcomingCard(props: {
  summary: LmsEventsSummaryPayload;
  className?: string;
}) {
  const { summary } = props;
  return (
    <Card className={props.className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Registered Events</CardTitle>
        <Link href="/lms/my-events" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary.upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming registered events.</p>
        ) : (
          summary.upcoming.map((item) => {
            const date = formatEventDate(item.startsAt);
            return (
              <Link
                key={item.eventId}
                href={item.href}
                className="flex gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                  <span className="text-[10px] font-semibold leading-none">{date.month}</span>
                  <span className="text-lg font-bold leading-tight">{date.day}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.startsAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </Link>
            );
          })
        )}
        <Button asChild size="sm" variant="outline" className="w-full gap-1">
          <Link href="/lms/events">
            Browse events
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function LmsEventsSummarySection() {
  const { loading, summary } = useLmsEventsSummary();
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading events…
      </div>
    );
  }
  if (!summary) return null;
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Training Events</h3>
          <p className="text-sm text-muted-foreground">
            Register for live training, workshops, and certification classes.
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0 gap-1">
          <Link href="/lms/events">
            Browse events
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <LmsEventsSummaryStats summary={summary} />
      <LmsEventsUpcomingCard summary={summary} />
    </section>
  );
}
