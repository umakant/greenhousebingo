import { NextRequest, NextResponse } from "next/server";

import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import {
  createLmsCourseSupportTicket,
  listLmsCourseSupportTicketsForStudent,
} from "@/lib/lms-course-support-service";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const courseId = parseLmsBigIntId(req.nextUrl.searchParams.get("courseId"));
  if (courseId == null) {
    return NextResponse.json({ ok: false, message: "courseId is required." }, { status: 400 });
  }

  const items = await listLmsCourseSupportTicketsForStudent({
    organizationId: actor.organizationId,
    courseId,
    studentUserId: actor.userId,
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  let body: { courseId?: string; lessonId?: string; subject?: string; message?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const courseId = parseLmsBigIntId(body.courseId);
  if (courseId == null) {
    return NextResponse.json({ ok: false, message: "Invalid course id." }, { status: 400 });
  }

  const lessonId = body.lessonId ? parseLmsBigIntId(body.lessonId) : null;
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message : "";

  if (!subject) {
    return NextResponse.json({ ok: false, message: "Subject is required." }, { status: 422 });
  }

  const user = await prisma.user.findFirst({
    where: { id: actor.userId },
    select: { name: true, email: true },
  });
  const studentName = user?.name?.trim() || "Learner";
  const studentEmail = user?.email?.trim() || "";

  try {
    const ticket = await createLmsCourseSupportTicket({
      organizationId: actor.organizationId,
      courseId,
      lessonId,
      studentUserId: actor.userId,
      subject,
      message,
      studentName,
      studentEmail,
    });
    return NextResponse.json({ ok: true, ticket, message: "Question submitted." }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create ticket.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
