"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { QRCodeTicket } from "@/components/lms/events/qr-code-ticket";
import { Button } from "@/components/ui/button";
import { lmsEventStudentDetailPath, lmsEventStudentRegisterPath } from "@/lib/lms-events/paths";
import type { LmsEvent, LmsEventRegistration } from "@/lib/lms-events/types";

function locationLabel(event: LmsEvent): string {
  if (event.deliveryMode === "online") return "Online";
  if (event.deliveryMode === "hybrid") {
    return event.venueCity ? `${event.venueCity} + Online` : "Hybrid";
  }
  return [event.venueName, event.venueCity].filter(Boolean).join(", ") || "Venue TBA";
}

export function LmsEventTicketClient(props: { eventId: string }) {
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
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading ticket…
      </div>
    );
  }

  if (!event) {
    return <p className="text-sm text-destructive">{err ?? "Event not found."}</p>;
  }

  if (!registration) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <p className="text-sm text-muted-foreground">You are not registered for this event yet.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href={lmsEventStudentRegisterPath(event.id)}>Register now</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={lmsEventStudentDetailPath(event.id)}>Back to event</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <QRCodeTicket
        eventTitle={event.title}
        attendeeName={registration.attendeeName}
        startsAt={event.startsAt}
        locationLabel={locationLabel(event)}
        qrToken={registration.qrToken}
        bookingStatus={registration.bookingStatus}
        onDownload={() => window.print()}
      />
      <div className="flex justify-center">
        <Button asChild variant="outline">
          <Link href={`/lms/my-events/${event.id}`}>View in My Events</Link>
        </Button>
      </div>
    </div>
  );
}
