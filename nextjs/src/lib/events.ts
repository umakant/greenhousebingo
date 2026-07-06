/**
 * Public event row shape consumed by the `/events` schedule page.
 *
 * Originally shipped (events-integration drop) as a static list. We've adapted it to be the
 * presentation contract for the `EventsSchedule` component while the *source of truth* lives in
 * the `storefront_events` Postgres table (see `storefront-events-prisma.ts`). The
 * {@link mapStorefrontEventDtoToEventItem} helper converts a `StorefrontEventDto` row into this
 * shape.
 *
 * Some fields the original schedule template surfaced (capacity, price) are not captured by our
 * admin CRUD today, so they're optional — `EventsSchedule` skips empty rows in the detail panel.
 */
export type EventItem = {
  id: string;
  /** URL slug for the public single-event page (`/events/[slug]`). */
  slug: string;
  /** 3-letter month abbreviation, uppercased ("MAY"). */
  monthShort: string;
  /** Zero-padded day of month ("16"). */
  day: string;
  title: string;
  /** Short summary shown on the list cards. */
  blurb: string;
  /** Display-formatted time range (e.g. "8:30 PM – 11:30 PM"). Empty when unknown. */
  time?: string;
  /** Venue/place name (e.g. "Liberty Park Lawn"). */
  location?: string;
  /** Street address line. */
  address?: string;
  capacity?: string;
  price?: string;
  /** Long-form description shown in the detail panel. */
  description: string;
  /** Optional CTA link (e.g. tickets, RSVP). When present the RSVP button targets it. */
  href?: string;
  /** Optional event image (cover photo). */
  imageUrl?: string;
  /** Raw start/end from API for calendar export (ISO strings). */
  eventDateIso?: string | null;
  endDateIso?: string | null;
};

/**
 * Lightweight subset of `StorefrontEventDto` that the mapper consumes — kept local so this module
 * doesn't pull in Prisma types in client bundles.
 */
export type StorefrontEventDtoLike = {
  id: string;
  slug: string;
  title: string;
  location: string | null;
  venue: string | null;
  eventDate: string | null;
  endDate: string | null;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

const MONTH_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * Format a Date as a 12-hour clock string (e.g. "8:30 PM"). Returns empty when `d` is invalid.
 * Uses local time so the displayed clock matches the operator's intent (events are typically
 * authored against the venue's local time and stored as TIMESTAMP without TZ semantics).
 */
function formatClock12h(d: Date): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const mm = m.toString().padStart(2, "0");
  return `${h}:${mm} ${ampm}`;
}

/**
 * Compose the detail-panel time string. Only emits text when the event has at least one
 * non-midnight time component, so all-day events don't render a misleading "12:00 AM" pill.
 */
function composeTimeLabel(start: Date | null, end: Date | null): string {
  const startHasTime = !!start && (start.getHours() !== 0 || start.getMinutes() !== 0);
  const endHasTime = !!end && (end.getHours() !== 0 || end.getMinutes() !== 0);
  if (!startHasTime && !endHasTime) return "";
  const left = startHasTime ? formatClock12h(start as Date) : "";
  const right = endHasTime ? formatClock12h(end as Date) : "";
  if (left && right) return `${left} – ${right}`;
  return left || right;
}

/** Compose a human-readable address line from structured parts, falling back to free-form. */
function composeAddress(dto: StorefrontEventDtoLike): string {
  const cityState = [dto.city, dto.state].filter((s) => !!s && s.trim().length > 0).join(", ");
  const parts = [dto.addressLine, cityState, dto.postalCode, dto.country]
    .map((s) => (s ?? "").trim())
    .filter((s) => s.length > 0);
  if (parts.length > 0) return parts.join(" · ");
  return (dto.location ?? "").trim();
}

/**
 * Convert a `StorefrontEventDto`-shaped row into the presentation `EventItem` consumed by
 * `EventsSchedule`. Tolerates missing values: empty fields stay empty so the UI can omit them.
 */
export function mapStorefrontEventDtoToEventItem(dto: StorefrontEventDtoLike): EventItem {
  const start = dto.eventDate ? new Date(dto.eventDate) : null;
  const end = dto.endDate ? new Date(dto.endDate) : null;

  const monthShort =
    start && !Number.isNaN(start.getTime()) ? MONTH_SHORT[start.getMonth()] : "TBA";
  const day =
    start && !Number.isNaN(start.getTime())
      ? start.getDate().toString().padStart(2, "0")
      : "—";

  const description = (dto.description ?? "").trim();
  const blurb = description.length > 160 ? `${description.slice(0, 157).trimEnd()}…` : description;

  return {
    id: dto.id,
    slug: dto.slug.trim(),
    monthShort,
    day,
    title: dto.title,
    blurb: blurb || "Details coming soon.",
    time: composeTimeLabel(start, end),
    location: (dto.venue ?? dto.location ?? "").trim(),
    address: composeAddress(dto),
    description: description || "Details for this event will be announced soon.",
    href: dto.linkUrl?.trim() || undefined,
    imageUrl: dto.imageUrl?.trim() || undefined,
    eventDateIso: dto.eventDate,
    endDateIso: dto.endDate,
  };
}
