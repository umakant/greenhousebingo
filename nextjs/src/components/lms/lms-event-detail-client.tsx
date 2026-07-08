"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  Calendar,
  Heart,
  Loader2,
  MapPin,
  Monitor,
  Ticket,
  User,
} from "lucide-react";

import { CalendarAddButton } from "@/components/lms/events/calendar-add-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { lmsEventTypeLabel } from "@/lib/lms-events/constants";
import {
  lmsEventStudentRegisterPath,
  lmsEventStudentTicketPath,
} from "@/lib/lms-events/paths";
import type { LmsEvent, LmsEventRegistration, LmsEventTicket } from "@/lib/lms-events/types";

function locationLabel(event: LmsEvent): string {
  if (event.deliveryMode === "online") return "Online";
  if (event.deliveryMode === "hybrid") {
    return event.venueCity ? `${event.venueCity} + Online` : "Hybrid";
  }
  return [event.venueName, event.venueCity, event.venueState].filter(Boolean).join(", ") || "Venue TBA";
}

export function LmsEventDetailClient(props: { eventId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [event, setEvent] = React.useState<LmsEvent | null>(null);
  const [tickets, setTickets] = React.useState<LmsEventTicket[]>([]);
  const [registration, setRegistration] = React.useState<LmsEventRegistration | null>(null);
  const [wishlisted, setWishlisted] = React.useState(false);
  const [wishlistBusy, setWishlistBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      const res = await fetch(`/api/lms/events/${encodeURIComponent(props.eventId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        event?: LmsEvent;
        tickets?: LmsEventTicket[];
        registration?: LmsEventRegistration | null;
        wishlisted?: boolean;
      } | null;
      if (cancelled) return;
      if (!res.ok || !data?.ok || !data.event) {
        setErr(data?.message ?? "Event not found.");
        setLoading(false);
        return;
      }
      setEvent(data.event);
      setTickets(data.tickets ?? []);
      setRegistration(data.registration ?? null);
      setWishlisted(Boolean(data.wishlisted));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [props.eventId]);

  async function toggleWishlist() {
    setWishlistBusy(true);
    try {
      const res = await fetch(`/api/lms/events/${encodeURIComponent(props.eventId)}/wishlist`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; wishlisted?: boolean } | null;
      if (res.ok && data?.ok) setWishlisted(Boolean(data.wishlisted));
    } finally {
      setWishlistBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading event…
      </div>
    );
  }

  if (err || !event) {
    return <p className="text-sm text-destructive">{err ?? "Event not found."}</p>;
  }

  const isRegistered = Boolean(registration);
  const priceLabel = event.isFree
    ? "Free"
    : event.priceFrom != null
      ? new Intl.NumberFormat(undefined, { style: "currency", currency: event.currency }).format(event.priceFrom)
      : "Paid";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="relative aspect-[21/9] bg-muted">
          {event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-100">
              <Calendar className="h-16 w-16 text-indigo-300" aria-hidden />
            </div>
          )}
        </div>
        <div className="space-y-4 p-6 lg:p-8">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{lmsEventTypeLabel(event.eventType)}</Badge>
            {event.certificationAvailable ? (
              <Badge className="gap-1 bg-amber-500 hover:bg-amber-500">
                <Award className="h-3 w-3" aria-hidden />
                Certification
              </Badge>
            ) : null}
            <Badge variant="outline" className="capitalize">
              {event.deliveryMode.replace(/_/g, " ")}
            </Badge>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{event.title}</h2>
          {event.shortDescription ? (
            <p className="max-w-3xl text-muted-foreground">{event.shortDescription}</p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoTile icon={Calendar} label="When">
              {new Date(event.startsAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
            </InfoTile>
            <InfoTile icon={event.deliveryMode === "online" ? Monitor : MapPin} label="Where">
              {locationLabel(event)}
            </InfoTile>
            <InfoTile icon={Ticket} label="Price">
              {priceLabel}
            </InfoTile>
            {event.instructorName ? (
              <InfoTile icon={User} label="Instructor">
                {event.instructorName}
              </InfoTile>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {isRegistered ? (
              <>
                <Button asChild>
                  <Link href={lmsEventStudentTicketPath(event.id)}>View ticket</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/lms/my-events/${event.id}`}>My registration</Link>
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link href={lmsEventStudentRegisterPath(event.id)}>Register</Link>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              disabled={wishlistBusy}
              onClick={() => void toggleWishlist()}
            >
              <Heart className={`h-4 w-4 ${wishlisted ? "fill-current text-red-500" : ""}`} aria-hidden />
              {wishlisted ? "Saved" : "Save"}
            </Button>
            <CalendarAddButton href={`/api/lms/events/${event.id}/calendar.ics`} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About this event</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-muted-foreground">
            {event.description ? (
              <p className="whitespace-pre-wrap">{event.description}</p>
            ) : (
              <p>No additional details provided.</p>
            )}
            {event.requirements ? (
              <div className="mt-4 rounded-lg border bg-muted/30 p-4 not-prose">
                <p className="text-sm font-medium text-foreground">Requirements</p>
                <p className="mt-1 text-sm">{event.requirements}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tickets listed yet.</p>
              ) : (
                tickets.map((t) => (
                  <div key={t.id} className="rounded-lg border p-3">
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.isFree
                        ? "Free"
                        : new Intl.NumberFormat(undefined, { style: "currency", currency: t.currency }).format(
                            t.price,
                          )}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          {event.seatsRemaining != null ? (
            <Card>
              <CardContent className="py-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{event.seatsRemaining}</span> seats remaining
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function InfoTile(props: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  const Icon = props.icon;
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {props.label}
      </p>
      <p className="mt-1 text-sm font-medium">{props.children}</p>
    </div>
  );
}
