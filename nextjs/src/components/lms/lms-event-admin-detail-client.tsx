"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, QrCode, Ticket, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  lmsEventAdminAttendeesPath,
  lmsEventAdminCheckInPath,
  lmsEventAdminTicketsPath,
} from "@/lib/lms-events/paths";
import type { LmsEvent, LmsEventAttendee, LmsEventTicket } from "@/lib/lms-events/types";

export function LmsEventAdminDetailClient(props: { eventId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [event, setEvent] = React.useState<LmsEvent | null>(null);
  const [tickets, setTickets] = React.useState<LmsEventTicket[]>([]);
  const [attendees, setAttendees] = React.useState<LmsEventAttendee[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/lms/admin/events/${encodeURIComponent(props.eventId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        event?: LmsEvent;
        tickets?: LmsEventTicket[];
        attendees?: LmsEventAttendee[];
      } | null;
      if (cancelled) return;
      if (!res.ok || !data?.ok || !data.event) {
        setErr(data?.message ?? "Event not found.");
        setLoading(false);
        return;
      }
      setEvent(data.event);
      setTickets(data.tickets ?? []);
      setAttendees(data.attendees ?? []);
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

  if (!event) return <p className="text-sm text-destructive">{err ?? "Event not found."}</p>;

  const checkedIn = attendees.filter((a) => a.checkedInAt).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge className="mb-2 capitalize">{event.status.replace(/_/g, " ")}</Badge>
          <h2 className="text-xl font-bold">{event.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(event.startsAt).toLocaleString()} · {event.registeredCount} registered · {checkedIn} checked in
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={lmsEventAdminAttendeesPath(event.id)}>
              <Users className="h-4 w-4" />
              Attendees
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={lmsEventAdminTicketsPath(event.id)}>
              <Ticket className="h-4 w-4" />
              Tickets
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <Link href={lmsEventAdminCheckInPath(event.id)}>
              <QrCode className="h-4 w-4" />
              Check-in
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tickets</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{tickets.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registrations</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{attendees.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {new Intl.NumberFormat(undefined, { style: "currency", currency: event.currency }).format(
              event.revenueTotal,
            )}
          </CardContent>
        </Card>
      </div>

      {event.description ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event experience</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          {event.isFeatured ? (
            <div>
              <span className="text-muted-foreground">Featured</span>
              <div className="font-medium">Yes</div>
            </div>
          ) : null}
          {event.ageRule ? (
            <div>
              <span className="text-muted-foreground">Age rule</span>
              <div className="font-medium">{event.ageRule}</div>
            </div>
          ) : null}
          {event.venueType ? (
            <div>
              <span className="text-muted-foreground">Venue type</span>
              <div className="font-medium">{event.venueType}</div>
            </div>
          ) : null}
          {event.doorsOpen || event.bingoStart ? (
            <div>
              <span className="text-muted-foreground">Doors / Bingo</span>
              <div className="font-medium">
                {[event.doorsOpen, event.bingoStart].filter(Boolean).join(" · ")}
              </div>
            </div>
          ) : null}
          {event.cardsIncluded != null ? (
            <div>
              <span className="text-muted-foreground">Cards included</span>
              <div className="font-medium">{event.cardsIncluded}</div>
            </div>
          ) : null}
          {event.extraCardPrice != null ? (
            <div>
              <span className="text-muted-foreground">Extra card</span>
              <div className="font-medium">${event.extraCardPrice}</div>
            </div>
          ) : null}
          {event.foodAndDrinks ? (
            <div>
              <span className="text-muted-foreground">Food & drinks</span>
              <div className="font-medium">{event.foodAndDrinks}</div>
            </div>
          ) : null}
          {event.attire ? (
            <div>
              <span className="text-muted-foreground">Attire</span>
              <div className="font-medium">{event.attire}</div>
            </div>
          ) : null}
          {event.seatsRemaining != null ? (
            <div>
              <span className="text-muted-foreground">Remaining</span>
              <div className="font-medium">{event.seatsRemaining}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
