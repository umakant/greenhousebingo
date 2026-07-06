import { NextRequest, NextResponse } from "next/server";

import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import { replyToLmsCourseSupportTicket } from "@/lib/lms-course-support-service";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
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

  let body: { message?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: actor.userId },
    select: { name: true },
  });

  try {
    const ticket = await replyToLmsCourseSupportTicket({
      organizationId: actor.organizationId,
      ticketId,
      authorUserId: actor.userId,
      authorName: user?.name?.trim() || "Learner",
      role: "student",
      message: typeof body.message === "string" ? body.message : "",
    });
    return NextResponse.json({ ok: true, ticket });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Reply failed.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
