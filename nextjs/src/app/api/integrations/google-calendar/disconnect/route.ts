import { NextRequest, NextResponse } from "next/server";

import { disconnectGoogleCalendar } from "@/lib/google-calendar-api";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  await disconnectGoogleCalendar(actor.userId);
  return NextResponse.json({ ok: true });
}
