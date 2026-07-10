export const DEFAULT_FEATURED_EVENTS_MAX_SLOTS = 10;
export const MIN_FEATURED_EVENTS_MAX_SLOTS = 1;
export const MAX_FEATURED_EVENTS_MAX_SLOTS = 100;

export type EventPlatformFeaturedEventsSettings = {
  maxSlots: number;
};

export type FeaturedEventsStats = {
  /** Total events currently marked featured (includes the event being edited). */
  used: number;
  maxSlots: number;
  remaining: number;
  atLimit: boolean;
  /** Whether another event can be marked featured (respects excludeEventId for edits). */
  canAddFeatured: boolean;
};

function clampMaxSlots(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_FEATURED_EVENTS_MAX_SLOTS;
  return Math.min(MAX_FEATURED_EVENTS_MAX_SLOTS, Math.max(MIN_FEATURED_EVENTS_MAX_SLOTS, Math.round(value)));
}

export function normalizeFeaturedEventsMaxSlots(value: unknown): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return clampMaxSlots(n);
}

export function validateFeaturedEventsSettings(input: EventPlatformFeaturedEventsSettings): string | null {
  const maxSlots = normalizeFeaturedEventsMaxSlots(input.maxSlots);
  if (maxSlots < MIN_FEATURED_EVENTS_MAX_SLOTS || maxSlots > MAX_FEATURED_EVENTS_MAX_SLOTS) {
    return `Featured slots must be between ${MIN_FEATURED_EVENTS_MAX_SLOTS} and ${MAX_FEATURED_EVENTS_MAX_SLOTS}.`;
  }
  return null;
}
