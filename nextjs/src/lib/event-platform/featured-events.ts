import "server-only";

import { EP_SETTINGS_KEYS } from "@/lib/event-platform/event-platform-settings";
import {
  DEFAULT_FEATURED_EVENTS_MAX_SLOTS,
  normalizeFeaturedEventsMaxSlots,
  type EventPlatformFeaturedEventsSettings,
  type FeaturedEventsStats,
} from "@/lib/event-platform/featured-events-types";
import { getSettingsForOwner, upsertOwnerSettings } from "@/lib/settings-service";
import { prisma } from "@/lib/prisma";

export {
  DEFAULT_FEATURED_EVENTS_MAX_SLOTS,
  MAX_FEATURED_EVENTS_MAX_SLOTS,
  MIN_FEATURED_EVENTS_MAX_SLOTS,
  normalizeFeaturedEventsMaxSlots,
  validateFeaturedEventsSettings,
  type EventPlatformFeaturedEventsSettings,
  type FeaturedEventsStats,
} from "@/lib/event-platform/featured-events-types";

export async function readEventPlatformFeaturedEventsSettings(
  organizationId: bigint,
): Promise<EventPlatformFeaturedEventsSettings> {
  const s = await getSettingsForOwner(organizationId);
  const raw = s[EP_SETTINGS_KEYS.featuredEventsMaxSlots]?.trim();
  if (!raw) return { maxSlots: DEFAULT_FEATURED_EVENTS_MAX_SLOTS };
  return { maxSlots: normalizeFeaturedEventsMaxSlots(raw) };
}

export async function writeEventPlatformFeaturedEventsSettings(
  organizationId: bigint,
  input: EventPlatformFeaturedEventsSettings,
): Promise<void> {
  const clamped = normalizeFeaturedEventsMaxSlots(input.maxSlots);
  await upsertOwnerSettings(organizationId, [
    { key: EP_SETTINGS_KEYS.featuredEventsMaxSlots, value: String(clamped) },
  ]);
}

export async function countFeaturedEvents(
  organizationId: bigint,
  excludeEventId?: bigint,
): Promise<number> {
  return prisma.lmsTrainingEvent.count({
    where: {
      organizationId,
      isFeatured: true,
      ...(excludeEventId != null ? { id: { not: excludeEventId } } : {}),
    },
  });
}

export async function getFeaturedEventsStats(
  organizationId: bigint,
  excludeEventId?: bigint,
): Promise<FeaturedEventsStats> {
  const settings = await readEventPlatformFeaturedEventsSettings(organizationId);
  const [used, usedForLimit] = await Promise.all([
    countFeaturedEvents(organizationId),
    countFeaturedEvents(organizationId, excludeEventId),
  ]);
  const maxSlots = settings.maxSlots;
  const remaining = Math.max(0, maxSlots - used);
  return {
    used,
    maxSlots,
    remaining,
    atLimit: used >= maxSlots,
    canAddFeatured: usedForLimit < maxSlots,
  };
}

export async function assertCanMarkEventFeatured(params: {
  organizationId: bigint;
  isFeatured: boolean;
  excludeEventId?: bigint;
}): Promise<void> {
  if (!params.isFeatured) return;
  const stats = await getFeaturedEventsStats(params.organizationId, params.excludeEventId);
  if (!stats.canAddFeatured) {
    throw new Error(
      `Featured event limit reached (${stats.used}/${stats.maxSlots}). Unfeature another event or increase the limit in Event Platform settings.`,
    );
  }
}
