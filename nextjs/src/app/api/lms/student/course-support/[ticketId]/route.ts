import { NextRequest, NextResponse } from "next/server";

import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import { getLmsCourseSupportTicket } from "@/lib/lms-course-support-service";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ ticketId: string }> },
) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { ticketId: raw } = await ctx.params;
  const ticketId = parseLmsBigIntId(raw);
  if (ticketId == null) {
    return NextResponse.json({ ok: false, message: "Invalid ticket id." }, { status: 400 });
  }

  const ticket = await getLmsCourseSupportTicket({
    organizationId: actor.organizationId,
    ticketId,
  });
  if (!ticket) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }
  if (ticket.lmsStudentUserId !== actor.userId.toString()) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ ok: true, ticket });
}
