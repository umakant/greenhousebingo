import { NextRequest, NextResponse } from "next/server";

import { getGoogleCalendarConnection } from "@/lib/google-calendar-api";
import { googleCalendarOAuthConfigured } from "@/lib/google-calendar-config";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const configured = googleCalendarOAuthConfigured();
  const conn = configured ? await getGoogleCalendarConnection(actor.userId) : null;

  return NextResponse.json({
    ok: true,
    configured,
    connected: Boolean(conn),
    googleEmail: conn?.googleEmail ?? null,
    syncLiveSessions: conn?.syncLiveSessions ?? false,
    calendarId: conn?.calendarId ?? "primary",
  });
}
