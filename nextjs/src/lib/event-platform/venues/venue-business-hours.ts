import { formatTime12h, toTime24, type TimePeriod } from "@/lib/format-time-12h";
import type { VenueWeekday } from "@/lib/event-platform/venues/venue-types";
import { VENUE_WEEKDAYS } from "@/lib/event-platform/venues/venue-types";

export const DEFAULT_VENUE_DAY_HOURS = "9:00 AM – 5:00 PM";

export type VenueDayHours = {
  isOpen: boolean;
  is24Hours: boolean;
  start: string;
  end: string;
};

function parse12hToken(text: string): string {
  const t = text.trim();
  const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    return toTime24(Number(match[1]), Number(match[2]), match[3].toUpperCase() as TimePeriod);
  }
  if (/^\d{2}:\d{2}$/.test(t)) return t;
  return "09:00";
}

export function parseVenueDayHours(raw: string): VenueDayHours {
  const trimmed = raw.trim();
  if (!trimmed || /^closed$/i.test(trimmed)) {
    return { isOpen: false, is24Hours: false, start: "09:00", end: "17:00" };
  }
  if (/^24\s*hours?$/i.test(trimmed)) {
    return { isOpen: true, is24Hours: true, start: "00:00", end: "23:59" };
  }
  const parts = trimmed.split(/\s*[–—-]\s*/);
  if (parts.length >= 2) {
    return {
      isOpen: true,
      is24Hours: false,
      start: parse12hToken(parts[0] ?? ""),
      end: parse12hToken(parts[1] ?? ""),
    };
  }
  return { isOpen: true, is24Hours: false, start: "09:00", end: "17:00" };
}

export function formatVenueDayHours(hours: VenueDayHours): string {
  if (!hours.isOpen) return "";
  if (hours.is24Hours) return "24 hours";
  return `${formatTime12h(hours.start)} – ${formatTime12h(hours.end)}`;
}

export function defaultVenueBusinessHours(): Record<VenueWeekday, string> {
  const hours = Object.fromEntries(VENUE_WEEKDAYS.map((day) => [day, ""])) as Record<
    VenueWeekday,
    string
  >;
  for (const day of VENUE_WEEKDAYS) {
    hours[day] = day === "sun" ? "" : DEFAULT_VENUE_DAY_HOURS;
  }
  return hours;
}
