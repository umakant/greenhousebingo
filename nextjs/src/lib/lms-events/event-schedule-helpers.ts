import { formatTime12h, toTime24, type TimePeriod } from "@/lib/format-time-12h";
import type { LmsEventCreateWizardInput } from "@/lib/lms-events/schemas";

/** Split ISO timestamp into date (YYYY-MM-DD) and time (HH:MM) for form controls. */
export function splitScheduleIso(iso: string): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function combineScheduleDateTime(date: string, time: string): string {
  if (!date.trim()) return "";
  const safeTime = time.trim() || "00:00";
  const [h, m] = safeTime.split(":").map((s) => Number.parseInt(s, 10) || 0);
  const [yy, mm, dd] = date.split("-").map((s) => Number.parseInt(s, 10) || 0);
  if (!yy || !mm || !dd) return "";
  const d = new Date(yy, mm - 1, dd, h, m, 0, 0);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

export function patchScheduleIso(iso: string, patch: { date?: string; time?: string }): string {
  const { date, time } = splitScheduleIso(iso);
  return combineScheduleDateTime(patch.date ?? date, patch.time ?? time);
}

/** Parse display labels like "5:30 PM" or "6:00 PM". */
export function parseScheduleDisplayTime(label: string): { hour12: number; minute: number; period: TimePeriod } | null {
  const m = label.trim().match(/^(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  const hour12 = Math.min(12, Math.max(1, Number.parseInt(m[1], 10) || 12));
  const minute = Math.min(59, Math.max(0, Number.parseInt(m[2], 10) || 0));
  const period = m[3].toUpperCase() as TimePeriod;
  return { hour12, minute, period };
}

/** Convert stored display time or ISO into ISO using a reference event date. */
export function scheduleValueToIso(value: string | null | undefined, eventDate: string, fallbackIso?: string): string {
  const raw = (value ?? "").trim();
  if (!raw) return fallbackIso?.trim() || "";
  if (raw.includes("T") && !Number.isNaN(new Date(raw).getTime())) return new Date(raw).toISOString();

  const date = eventDate.trim() || splitScheduleIso(fallbackIso ?? "").date;
  if (!date) return "";

  const parsed = parseScheduleDisplayTime(raw);
  if (parsed) {
    return combineScheduleDateTime(date, toTime24(parsed.hour12, parsed.minute, parsed.period));
  }

  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    return combineScheduleDateTime(date, raw);
  }

  return fallbackIso?.trim() || "";
}

/** Format ISO or 24h time as "5:30 PM" for DB / public site. */
export function formatScheduleDisplay(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (raw.includes("T")) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return formatTime12h(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
  }
  const parsed = parseScheduleDisplayTime(raw);
  if (parsed) {
    return formatTime12h(toTime24(parsed.hour12, parsed.minute, parsed.period));
  }
  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    return formatTime12h(raw);
  }
  return raw.slice(0, 32);
}

export function defaultScheduleTimes(eventDate: string) {
  return {
    doorsOpen: combineScheduleDateTime(eventDate, "17:30"),
    bingoStart: combineScheduleDateTime(eventDate, "19:00"),
    bingoEnd: combineScheduleDateTime(eventDate, "21:00"),
  };
}

export function eventDateFromIso(iso: string | null | undefined): string {
  return splitScheduleIso(iso ?? "").date;
}

/** Apply single-day event date to all schedule ISO fields. */
export function applyEventDateToSchedule(
  eventDate: string,
  current: {
    doorsOpen?: string;
    bingoStart?: string;
    bingoEnd?: string;
  },
): { doorsOpen: string; bingoStart: string; bingoEnd: string } {
  const patchDate = (iso: string, fallbackTime: string) => {
    const time = splitScheduleIso(iso).time || fallbackTime;
    return combineScheduleDateTime(eventDate, time);
  };
  return {
    doorsOpen: patchDate(current.doorsOpen ?? "", "17:30"),
    bingoStart: patchDate(current.bingoStart ?? "", "19:00"),
    bingoEnd: patchDate(current.bingoEnd ?? "", "21:00"),
  };
}

/** Normalize wizard schedule fields before API save. */
export function normalizeEventScheduleInput(input: LmsEventCreateWizardInput): LmsEventCreateWizardInput {
  const eventDate =
    input.eventDate?.trim() || eventDateFromIso(input.startsAt) || eventDateFromIso(input.bingoStart);

  const doorsIso = scheduleValueToIso(input.doorsOpen, eventDate, input.doorsOpen);
  const bingoStartIso =
    scheduleValueToIso(input.bingoStart, eventDate, input.startsAt) ||
    combineScheduleDateTime(eventDate, "19:00");
  const bingoEndIso =
    scheduleValueToIso(input.bingoEnd, eventDate, input.endsAt) ||
    combineScheduleDateTime(eventDate, "21:00");

  return {
    ...input,
    eventDate,
    startsAt: bingoStartIso,
    endsAt: bingoEndIso,
    doorsOpen: formatScheduleDisplay(doorsIso) ?? "",
    bingoStart: formatScheduleDisplay(bingoStartIso) ?? "",
    bingoEnd: formatScheduleDisplay(bingoEndIso) ?? "",
  };
}

/** Hydrate wizard ISO fields from stored event (display times + startsAt). */
export function hydrateEventScheduleFields(params: {
  startsAt: string;
  endsAt: string;
  doorsOpen?: string | null;
  bingoStart?: string | null;
  bingoEnd?: string | null;
}): Pick<LmsEventCreateWizardInput, "eventDate" | "doorsOpen" | "bingoStart" | "bingoEnd" | "startsAt" | "endsAt"> {
  const eventDate = eventDateFromIso(params.startsAt);
  const doorsIso = scheduleValueToIso(params.doorsOpen, eventDate, params.startsAt);
  const bingoStartIso = scheduleValueToIso(params.bingoStart, eventDate, params.startsAt);
  const bingoEndIso = scheduleValueToIso(params.bingoEnd, eventDate, params.endsAt);

  return {
    eventDate,
    startsAt: bingoStartIso || params.startsAt,
    endsAt: bingoEndIso || params.endsAt,
    doorsOpen: doorsIso,
    bingoStart: bingoStartIso || params.startsAt,
    bingoEnd: bingoEndIso || params.endsAt,
  };
}
