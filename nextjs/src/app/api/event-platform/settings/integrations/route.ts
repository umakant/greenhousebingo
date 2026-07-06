import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import {
  readEventPlatformIntegrationsSettings,
  writeEventPlatformIntegrationsSettings,
} from "@/lib/event-platform/event-platform-settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "integrations.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const settings = await readEventPlatformIntegrationsSettings(actor.organizationId);
  return NextResponse.json({ ok: true, settings });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "integrations.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, message: "Invalid body." }, { status: 400 });

  const settings = {
    openaiEnabled: Boolean(body.openaiEnabled),
    openaiKey: String(body.openaiKey ?? ""),
    geminiEnabled: Boolean(body.geminiEnabled),
    geminiKey: String(body.geminiKey ?? ""),
    stripeEnabled: Boolean(body.stripeEnabled),
    stripePublicKey: String(body.stripePublicKey ?? ""),
    stripeSecretKey: String(body.stripeSecretKey ?? ""),
    twilioEnabled: Boolean(body.twilioEnabled),
    twilioSid: String(body.twilioSid ?? ""),
    twilioToken: String(body.twilioToken ?? ""),
    googleMapsKey: String(body.googleMapsKey ?? ""),
  };

  await writeEventPlatformIntegrationsSettings(actor.organizationId, settings);
  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "integrations.settings.updated",
    entityType: "event_platform_settings",
  });

  return NextResponse.json({ ok: true, settings });
}
