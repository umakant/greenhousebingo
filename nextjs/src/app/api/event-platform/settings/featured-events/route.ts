import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import {
  countFeaturedEvents,
  getFeaturedEventsStats,
  readEventPlatformFeaturedEventsSettings,
  validateFeaturedEventsSettings,
  writeEventPlatformFeaturedEventsSettings,
  type EventPlatformFeaturedEventsSettings,
} from "@/lib/event-platform/featured-events";

export const dynamic = "force-dynamic";

const READ_PERMISSIONS = ["settings.manage", "events.view", "events.create", "events.update"] as const;

async function requireFeaturedEventsRead(req: NextRequest) {
  for (const permission of READ_PERMISSIONS) {
    const actor = await requireEventPlatformApi(req, permission);
    if (!isEventPlatformApiError(actor)) return actor;
  }
  return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
}

export async function GET(req: NextRequest) {
  const actor = await requireFeaturedEventsRead(req);
  if (isEventPlatformApiError(actor)) return actor;
  const [settings, stats] = await Promise.all([
    readEventPlatformFeaturedEventsSettings(actor.organizationId),
    getFeaturedEventsStats(actor.organizationId),
  ]);
  return NextResponse.json({ ok: true, settings, stats });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "settings.manage");
  if (isEventPlatformApiError(actor)) return actor;

  const body = (await req.json().catch(() => null)) as { settings?: EventPlatformFeaturedEventsSettings } | null;
  if (!body?.settings) {
    return NextResponse.json({ ok: false, message: "Invalid body." }, { status: 400 });
  }

  const message = validateFeaturedEventsSettings(body.settings);
  if (message) {
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  const used = await countFeaturedEvents(actor.organizationId);
  if (used > body.settings.maxSlots) {
    return NextResponse.json(
      {
        ok: false,
        message: `You already have ${used} featured events. Lower that count or set the limit to at least ${used}.`,
      },
      { status: 400 },
    );
  }

  await writeEventPlatformFeaturedEventsSettings(actor.organizationId, body.settings);
  const stats = await getFeaturedEventsStats(actor.organizationId);

  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "featured_events.settings.updated",
    entityType: "event_platform_settings",
    metadata: { maxSlots: body.settings.maxSlots },
  });

  return NextResponse.json({
    ok: true,
    settings: body.settings,
    stats,
    message: "Featured events settings saved.",
  });
}
