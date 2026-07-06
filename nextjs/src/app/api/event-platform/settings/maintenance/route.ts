import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import {
  readEventPlatformMaintenanceSettings,
  writeEventPlatformMaintenanceSettings,
} from "@/lib/event-platform/event-platform-settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "settings.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const settings = await readEventPlatformMaintenanceSettings(actor.organizationId);
  return NextResponse.json({ ok: true, settings });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "settings.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, message: "Invalid body." }, { status: 400 });

  const settings = {
    enabled: Boolean(body.enabled),
    title: String(body.title ?? ""),
    message: String(body.message ?? ""),
    backgroundImage: String(body.backgroundImage ?? ""),
    estimatedReturnAt: String(body.estimatedReturnAt ?? ""),
    bypassPath: String(body.bypassPath ?? ""),
    allowedAdminRoutes: String(body.allowedAdminRoutes ?? ""),
  };

  await writeEventPlatformMaintenanceSettings(actor.organizationId, settings);
  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "maintenance.settings.updated",
    entityType: "event_platform_settings",
    metadata: { enabled: settings.enabled },
  });

  return NextResponse.json({ ok: true, settings });
}
