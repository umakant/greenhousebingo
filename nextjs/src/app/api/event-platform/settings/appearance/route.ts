import { NextRequest, NextResponse } from "next/server";

import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import {
  readEventPlatformAppearanceSettings,
  writeEventPlatformAppearanceSettings,
  type EventPlatformAppearanceSettings,
} from "@/lib/event-platform/event-platform-settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "settings.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const settings = await readEventPlatformAppearanceSettings(actor.organizationId);
  return NextResponse.json({ ok: true, settings });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "settings.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const body = (await req.json().catch(() => null)) as EventPlatformAppearanceSettings | null;
  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid body." }, { status: 400 });
  }
  await writeEventPlatformAppearanceSettings(actor.organizationId, body);
  return NextResponse.json({ ok: true });
}
