import { NextRequest, NextResponse } from "next/server";

import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import {
  readEventPlatformLanguages,
  writeEventPlatformLanguages,
  type EventPlatformLanguage,
} from "@/lib/event-platform/event-platform-settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "settings.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const languages = await readEventPlatformLanguages(actor.organizationId);
  return NextResponse.json({ ok: true, languages });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "settings.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const body = (await req.json().catch(() => null)) as { languages?: EventPlatformLanguage[] } | null;
  if (!body?.languages || !Array.isArray(body.languages)) {
    return NextResponse.json({ ok: false, message: "Invalid languages." }, { status: 400 });
  }
  await writeEventPlatformLanguages(actor.organizationId, body.languages);
  return NextResponse.json({ ok: true });
}
