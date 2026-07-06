import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import { replyToLmsCourseSupportTicket } from "@/lib/lms-course-support-service";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function canViewInstructorSupport(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "view-lms-instructor-assignments") ||
    hasPermission(perms, "manage-lms-courses") ||
    hasPermission(perms, "manage-lms")
  );
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ ticketId: string }> },
) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const perms = await getPermissionsFromRequest(req);
  if (!canViewInstructorSupport(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { ticketId: raw } = await ctx.params;
  const ticketId = parseLmsBigIntId(raw);
  if (ticketId == null) {
    return NextResponse.json({ ok: false, message: "Invalid ticket id." }, { status: 400 });
  }

  let body: { message?: string; status?: string };
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
      authorName: user?.name?.trim() || "Instructor",
      role: "instructor",
      message: typeof body.message === "string" ? body.message : "",
      status: typeof body.status === "string" ? body.status : undefined,
    });
    return NextResponse.json({ ok: true, ticket });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Reply failed.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
