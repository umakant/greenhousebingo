import { NextRequest, NextResponse } from "next/server";

import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import {
  readEventPlatformEmailSettings,
  writeEventPlatformEmailSettings,
  type EventPlatformEmailSettings,
} from "@/lib/event-platform/event-platform-settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "settings.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const settings = await readEventPlatformEmailSettings(actor.organizationId);
  return NextResponse.json({ ok: true, settings });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "settings.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const body = (await req.json().catch(() => null)) as EventPlatformEmailSettings | null;
  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid body." }, { status: 400 });
  }
  await writeEventPlatformEmailSettings(actor.organizationId, body);
  return NextResponse.json({ ok: true });
}
