import { NextRequest, NextResponse } from "next/server";
import { LmsDeliveryType, Prisma } from "@prisma/client";

import { serializeLesson } from "@/lib/lms-course-content-serialize";
import { parseLmsBigIntId, requireLmsCourseCurriculumWrite } from "@/lib/lms-course-write-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TYPES: LmsDeliveryType[] = [
  LmsDeliveryType.VIDEO,
  LmsDeliveryType.TEXT,
  LmsDeliveryType.LIVE_CLASS,
  LmsDeliveryType.PDF,
];

function parseLessonType(v: unknown): LmsDeliveryType | null {
  if (typeof v !== "string") return null;
  const u = v.trim().toUpperCase().replace(/-/g, "_");
  return TYPES.includes(u as LmsDeliveryType) ? (u as LmsDeliveryType) : null;
}

function parseOptionalDate(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v !== "string") return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId: cRaw, lessonId: lRaw } = await ctx.params;
  const gate = await requireLmsCourseCurriculumWrite(req, cRaw);
  if (!gate.ok) return gate.response;
  const { actor, courseId } = gate;
  const lessonId = parseLmsBigIntId(lRaw);
  if (lessonId == null) {
    return NextResponse.json({ ok: false, message: "Invalid lesson id." }, { status: 400 });
  }

  const existing = await prisma.courseLesson.findFirst({
    where: { id: lessonId, courseId, organizationId: actor.organizationId },
    select: { id: true, sectionId: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Lesson not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const data: Prisma.CourseLessonUpdateInput = { updatedAt: new Date() };

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t) {
      return NextResponse.json({ ok: false, message: "title cannot be empty." }, { status: 400 });
    }
    data.title = t.slice(0, 512);
  }

  if (body.lessonType !== undefined) {
    const lt = parseLessonType(body.lessonType);
    if (!lt) {
      return NextResponse.json({ ok: false, message: "Invalid lessonType." }, { status: 400 });
    }
    data.lessonType = lt;
  }

  if ("bodyText" in body) {
    if (body.bodyText === null || body.bodyText === "") {
      data.bodyText = null;
    } else if (typeof body.bodyText === "string") {
      data.bodyText = body.bodyText;
    }
  }

  if ("videoUrl" in body) {
    if (body.videoUrl === null || body.videoUrl === "") {
      data.videoUrl = null;
    } else if (typeof body.videoUrl === "string") {
      data.videoUrl = body.videoUrl.trim().slice(0, 2048) || null;
    }
  }

  if ("videoMetadata" in body) {
    if (body.videoMetadata === null || body.videoMetadata === undefined) {
      data.videoMetadata = Prisma.DbNull;
    } else if (typeof body.videoMetadata === "object" || typeof body.videoMetadata === "string" || typeof body.videoMetadata === "number" || typeof body.videoMetadata === "boolean") {
      data.videoMetadata = body.videoMetadata as Prisma.InputJsonValue;
    }
  }

  if ("externalLiveUrl" in body) {
    if (body.externalLiveUrl === null || body.externalLiveUrl === "") {
      data.externalLiveUrl = null;
    } else if (typeof body.externalLiveUrl === "string") {
      data.externalLiveUrl = body.externalLiveUrl.trim().slice(0, 2048) || null;
    }
  }

  if ("liveStartsAt" in body) {
    const d = parseOptionalDate(body.liveStartsAt);
    if (d === undefined && body.liveStartsAt != null && body.liveStartsAt !== "") {
      return NextResponse.json({ ok: false, message: "Invalid liveStartsAt." }, { status: 400 });
    }
    if (d !== undefined) data.liveStartsAt = d;
  }
  if ("liveEndsAt" in body) {
    const d = parseOptionalDate(body.liveEndsAt);
    if (d === undefined && body.liveEndsAt != null && body.liveEndsAt !== "") {
      return NextResponse.json({ ok: false, message: "Invalid liveEndsAt." }, { status: 400 });
    }
    if (d !== undefined) data.liveEndsAt = d;
  }

  if ("durationSeconds" in body) {
    if (body.durationSeconds === null || body.durationSeconds === "") {
      data.durationSeconds = null;
    } else if (typeof body.durationSeconds === "number" && Number.isFinite(body.durationSeconds) && body.durationSeconds >= 0) {
      data.durationSeconds = Math.floor(body.durationSeconds);
    } else {
      return NextResponse.json({ ok: false, message: "Invalid durationSeconds." }, { status: 400 });
    }
  }

  if (typeof body.isPublished === "boolean") {
    data.isPublished = body.isPublished;
  }

  if ("targetSectionId" in body && body.targetSectionId != null && body.targetSectionId !== "") {
    const newSid = parseLmsBigIntId(typeof body.targetSectionId === "string" ? body.targetSectionId : null);
    if (newSid == null) {
      return NextResponse.json({ ok: false, message: "Invalid targetSectionId." }, { status: 400 });
    }
    const sec = await prisma.courseSection.findFirst({
      where: { id: newSid, courseId, organizationId: actor.organizationId },
      select: { id: true },
    });
    if (!sec) {
      return NextResponse.json({ ok: false, message: "Target section not found." }, { status: 400 });
    }
    if (newSid !== existing.sectionId) {
      const agg = await prisma.courseLesson.aggregate({
        where: { sectionId: newSid, courseId, organizationId: actor.organizationId },
        _max: { sortOrder: true },
      });
      const nextOrder = (agg._max.sortOrder ?? -1) + 1;
      data.section = { connect: { id: newSid } };
      data.sortOrder = nextOrder;
    }
  }

  const keys = Object.keys(data).filter((k) => k !== "updatedAt");
  if (keys.length === 0) {
    return NextResponse.json({ ok: false, message: "No valid fields to update." }, { status: 400 });
  }

  const row = await prisma.courseLesson.update({
    where: { id: lessonId, courseId, organizationId: actor.organizationId },
    data,
  });

  return NextResponse.json({ ok: true, lesson: serializeLesson(row) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId: cRaw, lessonId: lRaw } = await ctx.params;
  const gate = await requireLmsCourseCurriculumWrite(req, cRaw);
  if (!gate.ok) return gate.response;
  const { actor, courseId } = gate;
  const lessonId = parseLmsBigIntId(lRaw);
  if (lessonId == null) {
    return NextResponse.json({ ok: false, message: "Invalid lesson id." }, { status: 400 });
  }

  const del = await prisma.courseLesson.deleteMany({
    where: { id: lessonId, courseId, organizationId: actor.organizationId },
  });
  if (del.count === 0) {
    return NextResponse.json({ ok: false, message: "Lesson not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
