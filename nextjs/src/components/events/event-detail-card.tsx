import Link from "next/link";
import { EventDetailActions } from "@/components/events/event-detail-actions";
import { Calendar, Clock, MapPin, Ticket, Users } from "lucide-react";

import type { EventItem } from "@/lib/events";

/**
 * Reusable single-event detail template — the featured card from the schedule page,
 * shared by `/events/[slug]` and the inline detail panel on `/events`.
 */
export function EventDetailCard({
  event,
  showViewPageLink,
}: {
  event: EventItem;
  /** When true (schedule inline panel), show a link to the dedicated event page. */
  showViewPageLink?: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-md border border-border bg-card shadow-lg">
      {event.imageUrl ? (
        <div
          className="relative aspect-[16/9] w-full bg-muted bg-cover bg-center"
          style={{ backgroundImage: `url("${cssUrl(event.imageUrl)}")` }}
          role="img"
          aria-label={event.title}
        />
      ) : null}

      <div className="border-b border-border bg-accent/40 p-6">
        <div className="flex items-start gap-5">
          <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-md bg-orange-500 px-3 py-2 text-white">
            <span className="text-xs font-bold uppercase tracking-[0.2em]">{event.monthShort}</span>
            <span className="text-4xl font-extrabold leading-none">{event.day}</span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Featured event</p>
            <h1 className="mt-1 text-2xl font-bold uppercase tracking-[0.15em]">{event.title}</h1>
          </div>
        </div>
      </div>

      <div className="p-6">
        <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <DetailRow icon={<Clock className="h-4 w-4" />} label="Time" value={event.time} />
          <DetailRow icon={<MapPin className="h-4 w-4" />} label="Venue" value={event.location} />
          <DetailRow icon={<Calendar className="h-4 w-4" />} label="Address" value={event.address} />
          <DetailRow icon={<Users className="h-4 w-4" />} label="Capacity" value={event.capacity} />
          <DetailRow icon={<Ticket className="h-4 w-4" />} label="Admission" value={event.price} />
        </dl>

        <EventDetailActions event={event} />

        {showViewPageLink && event.slug ? (
          <p className="mt-5 text-center">
            <Link
              href={`/events/${encodeURIComponent(event.slug)}`}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition hover:text-orange-500"
            >
              View full event page →
            </Link>
          </p>
        ) : null}
      </div>
    </article>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | undefined;
}) {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) return null;
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-accent/30 p-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-orange-500">
        {icon}
      </span>
      <div>
        <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm">{trimmed}</dd>
      </div>
    </div>
  );
}

function cssUrl(raw: string): string {
  return raw.replace(/["\\]/g, (m) => `\\${m}`);
}
