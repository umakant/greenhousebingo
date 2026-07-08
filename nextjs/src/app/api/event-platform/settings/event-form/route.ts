import { NextRequest, NextResponse } from "next/server";

import { validateEventFormSettings, type EventPlatformEventFormSettings } from "@/lib/event-platform/event-form-options";
import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import {
  readEventPlatformEventFormSettings,
  writeEventPlatformEventFormSettings,
} from "@/lib/event-platform/event-platform-settings";

export const dynamic = "force-dynamic";

const READ_PERMISSIONS = ["settings.manage", "events.view", "events.create", "events.update"] as const;

async function requireEventFormRead(req: NextRequest) {
  for (const permission of READ_PERMISSIONS) {
    const actor = await requireEventPlatformApi(req, permission);
    if (!isEventPlatformApiError(actor)) return actor;
  }
  return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
}

export async function GET(req: NextRequest) {
  const actor = await requireEventFormRead(req);
  if (isEventPlatformApiError(actor)) return actor;
  const settings = await readEventPlatformEventFormSettings(actor.organizationId);
  return NextResponse.json({ ok: true, settings });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "settings.manage");
  if (isEventPlatformApiError(actor)) return actor;

  const body = (await req.json().catch(() => null)) as { settings?: EventPlatformEventFormSettings } | null;
  if (!body?.settings) {
    return NextResponse.json({ ok: false, message: "Invalid body." }, { status: 400 });
  }

  const message = validateEventFormSettings(body.settings);
  if (message) {
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  await writeEventPlatformEventFormSettings(actor.organizationId, body.settings);
  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "event_form.settings.updated",
    entityType: "event_platform_settings",
  });

  return NextResponse.json({ ok: true, settings: body.settings, message: "Event form options saved." });
}
