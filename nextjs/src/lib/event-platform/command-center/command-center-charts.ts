import { format, startOfDay, subDays } from "date-fns";

import type {
  CommandCenterCheckInTrendPoint,
  CommandCenterRegistrationTrendPoint,
} from "@/lib/event-platform/command-center/command-center-types";
import {
  filterValidRegistrations,
  type CommandCenterRegistrationRow,
} from "@/lib/event-platform/command-center/command-center-registration";

export function buildRegistrationTrend(
  rows: CommandCenterRegistrationRow[],
  rangeDays: number | "all",
  capacity: number | null,
): {
  rangeDays: number | "all";
  capacityTarget: number | null;
  points: CommandCenterRegistrationTrendPoint[];
} {
  const valid = filterValidRegistrations(rows);
  const now = startOfDay(new Date());
  const cutoff =
    rangeDays === "all" ? null : startOfDay(subDays(now, rangeDays - 1));

  const filtered = cutoff
    ? valid.filter((r) => startOfDay(r.registeredAt) >= cutoff)
    : valid;

  const byDay = new Map<string, number>();
  for (const row of filtered) {
    const key = format(startOfDay(row.registeredAt), "yyyy-MM-dd");
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  const sortedKeys = [...byDay.keys()].sort();
  let cumulative = 0;
  const points: CommandCenterRegistrationTrendPoint[] = sortedKeys.map((dateKey) => {
    const daily = byDay.get(dateKey) ?? 0;
    cumulative += daily;
    const d = new Date(`${dateKey}T12:00:00`);
    return {
      date: dateKey,
      label: format(d, "MMM d"),
      daily,
      cumulative,
    };
  });

  return { rangeDays, capacityTarget: capacity, points };
}

export function buildCheckInTrend(
  rows: CommandCenterRegistrationRow[],
  eventStartsAt: Date,
): {
  preEvent: boolean;
  eventStarted: boolean;
  points: CommandCenterCheckInTrendPoint[];
  remainingExpected: number;
} {
  const now = new Date();
  const eventStarted = now >= eventStartsAt;
  const preEvent = !eventStarted;

  const valid = filterValidRegistrations(rows);
  const checkedIn = valid.filter((r) => r.checkedInAt);
  const remainingExpected = valid.filter((r) => !r.checkedInAt).length;

  const byHour = new Map<string, number>();
  for (const row of checkedIn) {
    if (!row.checkedInAt) continue;
    const key = format(row.checkedInAt, "yyyy-MM-dd HH:00");
    byHour.set(key, (byHour.get(key) ?? 0) + 1);
  }

  const sortedKeys = [...byHour.keys()].sort();
  const points: CommandCenterCheckInTrendPoint[] = sortedKeys.map((hourKey) => {
    const d = new Date(hourKey.replace(" ", "T") + ":00");
    return {
      hour: hourKey,
      label: format(d, "h a"),
      checkIns: byHour.get(hourKey) ?? 0,
      walkIns: 0,
    };
  });

  return { preEvent, eventStarted, points, remainingExpected };
}
