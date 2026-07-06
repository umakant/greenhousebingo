import { NextRequest, NextResponse } from "next/server";

import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import {
  readEventPlatformEmailTemplates,
  writeEventPlatformEmailTemplates,
  type EventPlatformEmailTemplate,
} from "@/lib/event-platform/event-platform-settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "settings.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const templates = await readEventPlatformEmailTemplates(actor.organizationId);
  return NextResponse.json({ ok: true, templates });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "settings.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const body = (await req.json().catch(() => null)) as { templates?: EventPlatformEmailTemplate[] } | null;
  if (!body?.templates || !Array.isArray(body.templates)) {
    return NextResponse.json({ ok: false, message: "Invalid templates." }, { status: 400 });
  }
  await writeEventPlatformEmailTemplates(actor.organizationId, body.templates);
  return NextResponse.json({ ok: true });
}
