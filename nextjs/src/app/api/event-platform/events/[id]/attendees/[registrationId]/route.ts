import { NextRequest, NextResponse } from "next/server";

import { getEventAttendeeDetail } from "@/lib/event-platform/attendees/event-attendees-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; registrationId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.view");
  if (isEventPlatformApiError(actor)) return actor;

  const { id, registrationId } = await ctx.params;
  try {
    const detail = await getEventAttendeeDetail(actor.organizationId, id, registrationId);
    if (!detail) {
      return NextResponse.json({ ok: false, message: "Attendee not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, detail });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not load attendee.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
