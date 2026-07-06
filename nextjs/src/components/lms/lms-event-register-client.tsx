"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { EventRegistrationWizard } from "@/components/lms/events/event-registration-wizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LmsEventRegistrationWizardInput } from "@/lib/lms-events/schemas";
import { lmsEventStudentDetailPath, lmsEventStudentTicketPath } from "@/lib/lms-events/paths";
import type { LmsEvent, LmsEventRegistration, LmsEventTicket } from "@/lib/lms-events/types";

export function LmsEventRegisterClient(props: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [event, setEvent] = React.useState<LmsEvent | null>(null);
  const [tickets, setTickets] = React.useState<LmsEventTicket[]>([]);
  const [registration, setRegistration] = React.useState<LmsEventRegistration | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

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
        tickets?: LmsEventTicket[];
        registration?: LmsEventRegistration | null;
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
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [props.eventId]);

  async function onComplete(values: LmsEventRegistrationWizardInput) {
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/lms/events/${encodeURIComponent(props.eventId)}/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        registration?: LmsEventRegistration;
      } | null;
      if (!res.ok || !data?.ok) {
        setErr(data?.message ?? "Registration failed.");
        return;
      }
      router.push(lmsEventStudentTicketPath(props.eventId));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading registration…
      </div>
    );
  }

  if (!event) {
    return <p className="text-sm text-destructive">{err ?? "Event not found."}</p>;
  }

  if (registration) {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Already registered</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You are registered for <strong>{event.title}</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={lmsEventStudentTicketPath(event.id)}>View ticket</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={lmsEventStudentDetailPath(event.id)}>Back to event</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{event.title}</h2>
        <p className="text-sm text-muted-foreground">Complete the steps below to register.</p>
      </div>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      <EventRegistrationWizard
        tickets={tickets}
        requirements={event.requirements}
        submitting={submitting}
        onComplete={onComplete}
      />
    </div>
  );
}
