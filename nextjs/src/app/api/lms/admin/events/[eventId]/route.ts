import { NextRequest, NextResponse } from "next/server";

import { lmsEventAdminRepoFromRequest } from "@/lib/lms-events/server-context";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const repo = await lmsEventAdminRepoFromRequest(req);
  if (!repo) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { eventId } = await ctx.params;
  const [event, tickets, attendees] = await Promise.all([
    repo.getEventById(eventId),
    repo.listTickets(eventId),
    repo.listAttendees(eventId),
  ]);

  if (!event) {
    return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, event, tickets, attendees });
}
