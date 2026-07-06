"use client";

import Link from "next/link";
import { useCallback } from "react";
import { toast } from "sonner";

import type { EventItem } from "@/lib/events";
import { buildStorefrontEventIcsContent, downloadIcsFile } from "@/lib/event-calendar-ics";

import { RsvpButtonContent } from "@/components/events/event-rsvp-button-content";

const RSVP_OUTER =
  "group relative flex-1 overflow-hidden rounded-md bg-orange-500 px-8 py-5 text-left transition hover:brightness-95";

const CALENDAR_BTN =
  "rounded-md border border-border px-5 py-3 text-sm font-semibold uppercase tracking-wider transition hover:border-orange-500 hover:text-orange-500 disabled:pointer-events-none disabled:opacity-45 sm:px-6";

/** Public storefront contact when no ticketing URL is configured. */
const RSVP_FALLBACK_HREF = "/shop/pages/contact";

export function EventDetailActions({ event }: { event: EventItem }) {
  const onAddToCalendar = useCallback(() => {
    const ics = buildStorefrontEventIcsContent({
      id: event.id,
      title: event.title,
      description: event.description,
      venue: event.location,
      address: event.address,
      eventDateIso: event.eventDateIso ?? null,
      endDateIso: event.endDateIso ?? null,
    });
    if (!ics) {
      toast.error("This event does not have a start date yet, so a calendar file cannot be created.");
      return;
    }
    const base = (event.slug?.trim() || `event-${event.id}`).replace(/[^\w\-+.]+/g, "_");
    downloadIcsFile(`${base}.ics`, ics);
    toast.success("Calendar file downloaded");
  }, [event]);

  return (
    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-stretch">
      {event.href ? (
        <a
          href={event.href}
          target="_blank"
          rel="noopener noreferrer"
          data-pf-events-rsvp="1"
          className={RSVP_OUTER}
        >
          <RsvpButtonContent />
        </a>
      ) : (
        <Link href={RSVP_FALLBACK_HREF} data-pf-events-rsvp="1" className={RSVP_OUTER}>
          <RsvpButtonContent />
        </Link>
      )}
      <button
        type="button"
        data-pf-events-secondary="1"
        className={CALENDAR_BTN}
        onClick={onAddToCalendar}
        disabled={!event.eventDateIso?.trim()}
        title={
          event.eventDateIso?.trim()
            ? "Download an .ics file to add this event to your calendar"
            : "Add a start date for this event in the admin to enable calendar export"
        }
      >
        Add to Calendar
      </button>
    </div>
  );
}
