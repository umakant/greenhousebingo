import { NextRequest, NextResponse } from "next/server";

import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { assertEnrollmentLessonForStudent, type LessonProgressAction } from "@/lib/lms-lesson-progress";
import {
  loadStudentCourseProgressSnapshot,
  recordStudentLessonProgress,
} from "@/lib/lms-progress-service";
import { serializeCourseProgressSnapshot } from "@/lib/lms-progress-serialize";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

function parseId(raw: unknown): bigint | null {
  if (raw == null) return null;
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    try {
      return BigInt(Math.floor(raw));
    } catch {
      return null;
    }
  }
  if (typeof raw === "string") {
    try {
      return BigInt(raw.trim());
    } catch {
      return null;
    }
  }
  return null;
}

function parseAction(raw: unknown): LessonProgressAction | null {
  if (typeof raw !== "string") return null;
  const a = raw.trim().toLowerCase();
  if (a === "engage" || a === "complete" || a === "uncomplete") return a;
  return null;
}

/** GET course progress snapshot for the signed-in learner. */
export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const courseId = parseId(req.nextUrl.searchParams.get("courseId"));
  if (courseId == null) {
    return NextResponse.json({ ok: false, message: "courseId query param is required." }, { status: 400 });
  }

  const snap = await loadStudentCourseProgressSnapshot({
    organizationId: actor.organizationId,
    studentUserId: actor.userId,
    courseId,
  });
  if (!snap) {
    return NextResponse.json({ ok: false, message: "No enrollment for this course." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, progress: serializeCourseProgressSnapshot(snap) });
}

/**
 * POST body: { courseId, lessonId, action: "engage" | "complete" | "uncomplete" }
 * Stores progress per enrollment in lms_lesson_progress; returns updated section + course %.
 */
export async function POST(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const courseId = parseId(body?.courseId);
  const lessonId = parseId(body?.lessonId);
  const action = parseAction(body?.action);
  if (courseId == null || lessonId == null) {
    return NextResponse.json({ ok: false, message: "courseId and lessonId are required." }, { status: 400 });
  }
  if (!action) {
    return NextResponse.json(
      { ok: false, message: "action must be engage, complete, or uncomplete." },
      { status: 400 },
    );
  }

  const perms = await getPermissionsFromRequest(req);
  const gate = await assertEnrollmentLessonForStudent({
    organizationId: actor.organizationId,
    studentUserId: actor.userId,
    courseId,
    lessonId,
    perms,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, message: gate.message, code: gate.code },
      { status: gate.httpStatus },
    );
  }

  const snap = await recordStudentLessonProgress({
    organizationId: actor.organizationId,
    studentUserId: actor.userId,
    courseId,
    lessonId,
    action,
  });

  if (!snap) {
    return NextResponse.json({ ok: false, message: "Enrollment not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, progress: serializeCourseProgressSnapshot(snap) });
}
