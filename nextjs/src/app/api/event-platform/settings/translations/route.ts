import { NextRequest, NextResponse } from "next/server";

import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import {
  readEventPlatformTranslations,
  writeEventPlatformTranslations,
} from "@/lib/event-platform/event-platform-settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "settings.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const translations = await readEventPlatformTranslations(actor.organizationId);
  return NextResponse.json({ ok: true, translations });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "settings.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const body = (await req.json().catch(() => null)) as {
    translations?: Record<string, Record<string, string>>;
  } | null;
  if (!body?.translations || typeof body.translations !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid translations." }, { status: 400 });
  }
  await writeEventPlatformTranslations(actor.organizationId, body.translations);
  return NextResponse.json({ ok: true });
}
