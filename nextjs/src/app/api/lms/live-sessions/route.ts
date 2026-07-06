import { NextRequest, NextResponse } from "next/server";

import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import {
  createLiveSession,
  listLiveSessions,
  parseLiveMeetingProvider,
  parseSessionStatus,
} from "@/lib/lms-live-session-service";
import { canManageLmsLiveSessions } from "@/lib/lms-live-session-access";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

function parseDate(raw: unknown): Date | null {
  if (raw == null) return null;
  const d = new Date(typeof raw === "string" ? raw : String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageLmsLiveSessions(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const courseId = parseLmsBigIntId(req.nextUrl.searchParams.get("courseId") ?? undefined);
  const status = parseSessionStatus(req.nextUrl.searchParams.get("status") ?? undefined);
  const from = parseDate(req.nextUrl.searchParams.get("from"));
  const to = parseDate(req.nextUrl.searchParams.get("to"));

  const items = await listLiveSessions({
    organizationId: actor.organizationId,
    courseId: courseId ?? undefined,
    status: status ?? undefined,
    from: from ?? undefined,
    to: to ?? undefined,
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageLmsLiveSessions(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const courseId = parseLmsBigIntId(typeof body?.courseId === "string" ? body.courseId : undefined);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const startsAt = parseDate(body?.startsAt);
  const endsAt = parseDate(body?.endsAt);

  if (courseId == null) {
    return NextResponse.json({ ok: false, message: "courseId is required." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ ok: false, message: "title is required." }, { status: 400 });
  }
  if (!startsAt || !endsAt) {
    return NextResponse.json({ ok: false, message: "startsAt and endsAt are required." }, { status: 400 });
  }

  const capacityRaw = body?.capacity;
  let capacity: number | null = null;
  if (capacityRaw != null && capacityRaw !== "") {
    const n = Number(capacityRaw);
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json({ ok: false, message: "capacity must be a positive number." }, { status: 400 });
    }
    capacity = Math.floor(n);
  }

  try {
    const session = await createLiveSession({
      organizationId: actor.organizationId,
      courseId,
      createdById: actor.userId,
      title,
      description: typeof body?.description === "string" ? body.description : null,
      startsAt,
      endsAt,
      meetingProvider: parseLiveMeetingProvider(body?.meetingProvider) ?? undefined,
      meetingUrl: typeof body?.meetingUrl === "string" ? body.meetingUrl : null,
      capacity,
      courseLessonId: parseLmsBigIntId(typeof body?.courseLessonId === "string" ? body.courseLessonId : undefined),
      syncLesson: body?.syncLesson === true,
      sectionId: parseLmsBigIntId(typeof body?.sectionId === "string" ? body.sectionId : undefined),
    });
    return NextResponse.json({ ok: true, session });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Could not create session." },
      { status: 400 },
    );
  }
}
