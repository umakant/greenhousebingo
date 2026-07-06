import { NextRequest, NextResponse } from "next/server";

import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { parseLmsBigIntId } from "@/lib/lms-course-write-context";
import {
  deleteLiveSession,
  getLiveSession,
  parseLiveMeetingProvider,
  parseSessionStatus,
  updateLiveSession,
} from "@/lib/lms-live-session-service";
import { canManageLmsLiveSessions } from "@/lib/lms-live-session-access";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

function parseDate(raw: unknown): Date | null {
  if (raw == null) return null;
  const d = new Date(typeof raw === "string" ? raw : String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageLmsLiveSessions(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { sessionId: raw } = await ctx.params;
  const sessionId = parseLmsBigIntId(raw);
  if (sessionId == null) {
    return NextResponse.json({ ok: false, message: "Invalid session id." }, { status: 400 });
  }

  const session = await getLiveSession(actor.organizationId, sessionId);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, session });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageLmsLiveSessions(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { sessionId: raw } = await ctx.params;
  const sessionId = parseLmsBigIntId(raw);
  if (sessionId == null) {
    return NextResponse.json({ ok: false, message: "Invalid session id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const capacityRaw = body?.capacity;
  let capacity: number | null | undefined;
  if (body && "capacity" in body) {
    if (capacityRaw == null || capacityRaw === "") capacity = null;
    else {
      const n = Number(capacityRaw);
      if (!Number.isFinite(n) || n < 1) {
        return NextResponse.json({ ok: false, message: "capacity must be a positive number." }, { status: 400 });
      }
      capacity = Math.floor(n);
    }
  }

  try {
    const session = await updateLiveSession(actor.organizationId, sessionId, {
      ...(typeof body?.title === "string" ? { title: body.title.trim() } : {}),
      ...(body && "description" in body
        ? { description: typeof body.description === "string" ? body.description : null }
        : {}),
      ...(parseDate(body?.startsAt) ? { startsAt: parseDate(body?.startsAt)! } : {}),
      ...(parseDate(body?.endsAt) ? { endsAt: parseDate(body?.endsAt)! } : {}),
      ...(parseLiveMeetingProvider(body?.meetingProvider) ? { meetingProvider: parseLiveMeetingProvider(body?.meetingProvider)! } : {}),
      ...(body && "meetingUrl" in body
        ? { meetingUrl: typeof body.meetingUrl === "string" ? body.meetingUrl : null }
        : {}),
      ...(capacity !== undefined ? { capacity } : {}),
      ...(parseSessionStatus(body?.status) ? { status: parseSessionStatus(body?.status)! } : {}),
      ...(body && "courseLessonId" in body
        ? {
            courseLessonId: parseLmsBigIntId(
              typeof body.courseLessonId === "string" ? body.courseLessonId : undefined,
            ),
          }
        : {}),
    });
    if (!session) {
      return NextResponse.json({ ok: false, message: "Session not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, session });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Could not update session." },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canManageLmsLiveSessions(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { sessionId: raw } = await ctx.params;
  const sessionId = parseLmsBigIntId(raw);
  if (sessionId == null) {
    return NextResponse.json({ ok: false, message: "Invalid session id." }, { status: 400 });
  }

  const deleted = await deleteLiveSession(actor.organizationId, sessionId);
  if (!deleted) {
    return NextResponse.json({ ok: false, message: "Session not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
