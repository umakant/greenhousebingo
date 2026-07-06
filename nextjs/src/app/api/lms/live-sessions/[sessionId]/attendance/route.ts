import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import {
  listSessionAttendance,
  parseAttendanceStatus,
  seedSessionAttendanceRoster,
  updateAttendanceStatus,
} from "@/lib/lms-live-session-service";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

function canManageClasses(perms: string[]): boolean {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-lms-classes") ||
    hasPermission(perms, "manage-lms-courses") ||
    hasPermission(perms, "manage-lms")
  );
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageClasses(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { sessionId: raw } = await ctx.params;
  const sessionId = parseLmsBigIntId(raw);
  if (sessionId == null) {
    return NextResponse.json({ ok: false, message: "Invalid session id." }, { status: 400 });
  }

  const items = await listSessionAttendance(actor.organizationId, sessionId);
  if (items == null) {
    return NextResponse.json({ ok: false, message: "Session not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, items });
}

/** POST { action: "seed" } — register all active enrollments, or PATCH individual via attendanceId route */
export async function POST(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageClasses(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { sessionId: raw } = await ctx.params;
  const sessionId = parseLmsBigIntId(raw);
  if (sessionId == null) {
    return NextResponse.json({ ok: false, message: "Invalid session id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof body?.action === "string" ? body.action.trim().toLowerCase() : "seed";

  if (action === "seed") {
    try {
      const items = await seedSessionAttendanceRoster(actor.organizationId, sessionId);
      if (items == null) {
        return NextResponse.json({ ok: false, message: "Session not found." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, items });
    } catch (e) {
      return NextResponse.json(
        { ok: false, message: e instanceof Error ? e.message : "Could not seed roster." },
        { status: 400 },
      );
    }
  }

  const attendanceId = parseLmsBigIntId(typeof body?.attendanceId === "string" ? body.attendanceId : undefined);
  const status = parseAttendanceStatus(body?.status);
  if (attendanceId == null || !status) {
    return NextResponse.json(
      { ok: false, message: "For updates use attendanceId + status, or action=seed." },
      { status: 400 },
    );
  }

  try {
    const row = await updateAttendanceStatus({
      organizationId: actor.organizationId,
      sessionId,
      attendanceId,
      status,
      markedById: actor.userId,
      notes: typeof body?.notes === "string" ? body.notes : undefined,
    });
    if (!row) {
      return NextResponse.json({ ok: false, message: "Attendance record not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item: row });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Could not update attendance." },
      { status: 400 },
    );
  }
}
