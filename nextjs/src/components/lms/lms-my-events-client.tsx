"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { EventCard } from "@/components/lms/events/event-card";
import { EventEmptyState } from "@/components/lms/events/event-empty-state";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lmsEventStudentTicketPath, lmsMyEventDetailPath } from "@/lib/lms-events/paths";
import type { LmsEvent, LmsEventRegistration } from "@/lib/lms-events/types";

type TabKey = "upcoming" | "completed" | "cancelled" | "waitlisted";

const TAB_LABELS: Record<TabKey, string> = {
  upcoming: "Upcoming",
  completed: "Completed",
  cancelled: "Cancelled",
  waitlisted: "Waitlisted",
};

type MyEventItem = { registration: LmsEventRegistration; event: LmsEvent | null };

export function LmsMyEventsClient() {
  const [tab, setTab] = React.useState<TabKey>("upcoming");
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<MyEventItem[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      const res = await fetch(`/api/lms/my-events?tab=${tab}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        items?: MyEventItem[];
      } | null;
      if (cancelled) return;
      if (!res.ok || !data?.ok) {
        setErr(data?.message ?? "Could not load your events.");
        setLoading(false);
        return;
      }
      setItems(data.items ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
            <TabsTrigger key={key} value={key}>
              {TAB_LABELS[key]}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
          <TabsContent key={key} value={key} className="mt-4">
            {loading ? (
              <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : err ? (
              <p className="text-sm text-destructive">{err}</p>
            ) : items.length === 0 ? (
              <EventEmptyState
                title={`No ${TAB_LABELS[key].toLowerCase()} events`}
                description="Browse the catalog to register for training sessions."
                actionHref="/lms/events"
                actionLabel="Browse events"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map(({ registration, event }) =>
                  event ? (
                    <div key={registration.id} className="relative">
                      <EventCard
                        event={event}
                        href={lmsMyEventDetailPath(event.id)}
                        showRegister={false}
                      />
                      <div className="absolute right-3 top-3">
                        <Badge variant="secondary" className="capitalize">
                          {registration.bookingStatus.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export function LmsMyEventDetailClient(props: { eventId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [event, setEvent] = React.useState<LmsEvent | null>(null);
  const [registration, setRegistration] = React.useState<LmsEventRegistration | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/lms/events/${encodeURIComponent(props.eventId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        event?: LmsEvent;
        registration?: LmsEventRegistration | null;
      } | null;
      if (cancelled) return;
      if (!res.ok || !data?.ok || !data.event) {
        setErr(data?.message ?? "Event not found.");
        setLoading(false);
        return;
      }
      setEvent(data.event);
      setRegistration(data.registration ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [props.eventId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!event || !registration) {
    return (
      <EventEmptyState
        title="Registration not found"
        description="You may not be registered for this event."
        actionHref="/lms/events"
        actionLabel="Browse events"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge className="mb-2 capitalize">{registration.bookingStatus.replace(/_/g, " ")}</Badge>
            <h2 className="text-xl font-bold">{event.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Registered {new Date(registration.registeredAt).toLocaleString()}
            </p>
          </div>
          <Link
            href={lmsEventStudentTicketPath(event.id)}
            className="text-sm font-medium text-primary hover:underline"
          >
            View ticket →
          </Link>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Attendee</dt>
            <dd className="font-medium">{registration.attendeeName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{registration.attendeeEmail}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">When</dt>
            <dd className="font-medium">
              {new Date(event.startsAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Payment</dt>
            <dd className="font-medium capitalize">{registration.paymentStatus}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
