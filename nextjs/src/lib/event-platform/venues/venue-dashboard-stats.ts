import type { EventVenueDto } from "@/lib/event-platform/venues/venue-types";

export type VenueCapacityTier = "small" | "medium" | "large" | "xlarge" | "unknown";

export type VenueDashboardSummary = {
  totalVenues: number;
  activeVenues: number;
  venuesInUse: number;
  totalCapacity: number;
  avgCapacity: number;
};

export type VenueCapacitySlice = {
  key: VenueCapacityTier;
  label: string;
  range: string;
  count: number;
  percent: number;
  color: string;
};

export type VenueAmenityRow = {
  label: string;
  count: number;
  total: number;
  percent: number;
};

export type VenueEventCountRow = {
  venueId: string;
  venueName: string;
  count: number;
};

const CAPACITY_TIERS: { key: VenueCapacityTier; label: string; range: string; min: number; max: number; color: string }[] =
  [
    { key: "small", label: "Small", range: "1–100", min: 1, max: 100, color: "#22c55e" },
    { key: "medium", label: "Medium", range: "101–300", min: 101, max: 300, color: "#3b82f6" },
    { key: "large", label: "Large", range: "301–600", min: 301, max: 600, color: "#f97316" },
    { key: "xlarge", label: "Extra Large", range: "601+", min: 601, max: Infinity, color: "#a855f7" },
  ];

export function venueCapacityTier(seating: number | null | undefined): VenueCapacityTier {
  if (seating == null || seating <= 0) return "unknown";
  if (seating <= 100) return "small";
  if (seating <= 300) return "medium";
  if (seating <= 600) return "large";
  return "xlarge";
}

export function computeVenueDashboardSummary(
  venues: EventVenueDto[],
  venuesInUseIds: Set<string>,
): VenueDashboardSummary {
  const active = venues.filter((v) => v.status === "active");
  const capacities = venues.map((v) => v.seating).filter((s): s is number => s != null && s > 0);
  const totalCapacity = capacities.reduce((sum, n) => sum + n, 0);
  const avgCapacity = capacities.length ? Math.round(totalCapacity / capacities.length) : 0;
  const inUse = venues.filter((v) => venuesInUseIds.has(v.id)).length;

  return {
    totalVenues: venues.length,
    activeVenues: active.length,
    venuesInUse: inUse,
    totalCapacity,
    avgCapacity,
  };
}

export function computeCapacitySlices(venues: EventVenueDto[]): VenueCapacitySlice[] {
  const withSeating = venues.filter((v) => v.seating != null && v.seating > 0);
  const total = withSeating.length || 1;

  return CAPACITY_TIERS.map((tier) => {
    const count = withSeating.filter((v) => {
      const s = v.seating ?? 0;
      return s >= tier.min && s <= tier.max;
    }).length;
    return {
      key: tier.key,
      label: tier.label,
      range: tier.range,
      count,
      percent: Math.round((count / total) * 100),
      color: tier.color,
    };
  });
}

export function computeAmenityRows(venues: EventVenueDto[]): VenueAmenityRow[] {
  const total = venues.length || 1;
  const count = (pred: (v: EventVenueDto) => boolean) => venues.filter(pred).length;

  return [
    { label: "Food service", count: count((v) => v.food), total: venues.length, percent: Math.round((count((v) => v.food) / total) * 100) },
    {
      label: "Drinks (alcohol)",
      count: count((v) => v.drinksAlcohol),
      total: venues.length,
      percent: Math.round((count((v) => v.drinksAlcohol) / total) * 100),
    },
    {
      label: "Age 21+",
      count: count((v) => v.age21Plus),
      total: venues.length,
      percent: Math.round((count((v) => v.age21Plus) / total) * 100),
    },
    {
      label: "Contact on file",
      count: count((v) => Boolean(v.contactEmail?.trim() || v.contactPhone?.trim())),
      total: venues.length,
      percent: Math.round((count((v) => Boolean(v.contactEmail?.trim() || v.contactPhone?.trim())) / total) * 100),
    },
    {
      label: "Website listed",
      count: count((v) => Boolean(v.website?.trim())),
      total: venues.length,
      percent: Math.round((count((v) => Boolean(v.website?.trim())) / total) * 100),
    },
    {
      label: "Map coordinates",
      count: count((v) => Boolean(v.latitude?.trim() && v.longitude?.trim())),
      total: venues.length,
      percent: Math.round((count((v) => Boolean(v.latitude?.trim() && v.longitude?.trim())) / total) * 100),
    },
  ];
}

/** Match LMS event venue names to dashboard venues (case-insensitive contains). */
export function matchVenueToEvent(venue: EventVenueDto, eventVenueName: string | null | undefined): boolean {
  const a = venue.name.trim().toLowerCase();
  const b = (eventVenueName ?? "").trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function computeUpcomingByVenue(
  venues: EventVenueDto[],
  events: { venueName?: string | null; startsAt?: string | null }[],
): VenueEventCountRow[] {
  const now = Date.now();
  const upcoming = events.filter((e) => {
    if (!e.startsAt) return false;
    const t = new Date(e.startsAt).getTime();
    return Number.isFinite(t) && t >= now;
  });

  const rows: VenueEventCountRow[] = [];
  for (const venue of venues) {
    const count = upcoming.filter((e) => matchVenueToEvent(venue, e.venueName)).length;
    if (count > 0) rows.push({ venueId: venue.id, venueName: venue.name, count });
  }
  return rows.sort((a, b) => b.count - a.count).slice(0, 6);
}

export type VenueEventCounts = { scheduled: number; upcoming: number };

/**
 * Per-venue event tallies for the venues table "Events" column.
 * `scheduled` = all events matched to the venue; `upcoming` = those starting now or later.
 */
export function computeEventCountsByVenue(
  venues: EventVenueDto[],
  events: { venueName?: string | null; startsAt?: string | null }[],
): Map<string, VenueEventCounts> {
  const now = Date.now();
  const map = new Map<string, VenueEventCounts>();
  for (const venue of venues) {
    const matched = events.filter((e) => matchVenueToEvent(venue, e.venueName));
    const upcoming = matched.filter((e) => {
      if (!e.startsAt) return false;
      const t = new Date(e.startsAt).getTime();
      return Number.isFinite(t) && t >= now;
    }).length;
    map.set(venue.id, { scheduled: matched.length, upcoming });
  }
  return map;
}

export function venueInUseIds(
  venues: EventVenueDto[],
  events: { venueName?: string | null; startsAt?: string | null }[],
): Set<string> {
  const now = Date.now();
  const ids = new Set<string>();
  for (const venue of venues) {
    const hasUpcoming = events.some((e) => {
      if (!e.startsAt) return false;
      const t = new Date(e.startsAt).getTime();
      return Number.isFinite(t) && t >= now && matchVenueToEvent(venue, e.venueName);
    });
    if (hasUpcoming) ids.add(venue.id);
  }
  return ids;
}

export { CAPACITY_TIERS };
