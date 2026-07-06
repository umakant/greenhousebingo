/**
 * Presentation contract for the Apple-style appointments calendar at
 * `/storefront/events-schedule`. The page is a Server Component that fetches the storefront's
 * `storefront_events` rows via {@link listEventsForOrg} (the same Prisma helper backing the admin
 * `/api/storefront/events` GET endpoint), maps each row to this `CalendarEvent` shape using
 * {@link mapStorefrontEventDtoToCalendarEvent}, and passes the array to `<CalendarApp events />`.
 *
 * The original integration drop shipped a static `events` array; we replaced it with the live DB
 * source so the schedule view stays in sync with the events admin and the public storefront
 * carousel.
 */
export type CalendarEvent = {
  id: string;
  title: string;
  /** Calendar date in `YYYY-MM-DD` (local interpretation, no TZ shifts). */
  date: string;
  /** Start clock in 24h `HH:mm`. */
  startTime: string;
  /** End clock in 24h `HH:mm`. Falls back to `startTime` for instantaneous / unknown durations. */
  endTime: string;
  /** Display venue name (e.g. "Railroad Park"). */
  location: string;
  /** Free-form address line for the address tab. */
  address: string;
  /** String passed to Google Maps embed `?q=` — usually the address line, optionally with venue. */
  mapQuery: string;
  description: string;
  attendees: string[];
  /** Visual color tag rendered on the calendar dots / sheet header. */
  color: "red" | "blue" | "green" | "orange" | "purple";
  rsvp?: "yes" | "no" | "maybe" | null;
};

/** Subset of the admin DTO that the mapper consumes. */
export type StorefrontEventDtoLikeForCalendar = {
  id: string;
  title: string;
  location: string | null;
  venue: string | null;
  eventDate: string | null;
  endDate: string | null;
  description: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  isFeatured: boolean;
};

/**
 * Filter + sort helper used by the calendar UI. Pure function so the CalendarApp component can
 * call it for both the day-cell badges and the right-rail day list.
 */
export function eventsByDate(date: string, list: CalendarEvent[]): CalendarEvent[] {
  return list
    .filter((e) => e.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/** Tailwind background-color class for a calendar event color tag. */
export function colorClass(c: CalendarEvent["color"]): string {
  switch (c) {
    case "red":
      return "bg-rose-500";
    case "blue":
      return "bg-sky-500";
    case "green":
      return "bg-emerald-500";
    case "orange":
      return "bg-orange-500";
    case "purple":
      return "bg-violet-500";
  }
}

/**
 * Map a `StorefrontEventDto`-shaped row → `CalendarEvent`. Tolerates missing fields:
 *  - no event_date  → row is skipped at the page layer (calendar needs a date).
 *  - no end_date    → endTime collapses to startTime (still readable in the bottom sheet).
 *  - no description → "" (calendar shows the location/time in the sheet header anyway).
 *
 * Color is derived from the row's `isFeatured` flag (featured → orange brand tone, else sky)
 * since the admin doesn't capture an explicit calendar color today. This keeps the storefront's
 * brand orange in the mix without making the calendar look monochrome.
 */
export function mapStorefrontEventDtoToCalendarEvent(
  dto: StorefrontEventDtoLikeForCalendar,
): CalendarEvent | null {
  if (!dto.eventDate) return null;
  const start = new Date(dto.eventDate);
  if (Number.isNaN(start.getTime())) return null;

  const end = dto.endDate ? new Date(dto.endDate) : null;
  const endValid = end && !Number.isNaN(end.getTime()) ? end : null;

  const date = formatYmd(start);
  const startTime = formatHm(start);
  const endTime = endValid ? formatHm(endValid) : startTime;

  const venue = (dto.venue ?? dto.location ?? "").trim();
  const cityState = [dto.city, dto.state].filter((p): p is string => !!p && p.trim().length > 0).join(", ");
  const fullAddressParts = [dto.addressLine, cityState, dto.postalCode, dto.country]
    .map((s) => (s ?? "").trim())
    .filter((s) => s.length > 0);
  const fullAddress = fullAddressParts.join(", ") || venue;
  const mapQuery =
    fullAddressParts.length > 0
      ? fullAddressParts.join(", ")
      : venue || "";

  const color: CalendarEvent["color"] = dto.isFeatured ? "orange" : "blue";

  return {
    id: dto.id,
    title: dto.title,
    date,
    startTime,
    endTime,
    location: venue || cityState || "Location TBA",
    address: fullAddress || "Address TBA",
    mapQuery,
    description: (dto.description ?? "").trim(),
    attendees: [],
    color,
  };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Local-time `YYYY-MM-DD` (avoids the `toISOString` UTC-shift trap). */
function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Local-time `HH:mm`. */
function formatHm(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
