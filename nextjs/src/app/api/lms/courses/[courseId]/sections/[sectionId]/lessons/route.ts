import { NextRequest, NextResponse } from "next/server";
import { LmsDeliveryType } from "@prisma/client";

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

export async function POST(req: NextRequest, ctx: { params: Promise<{ courseId: string; sectionId: string }> }) {
  const { courseId: cRaw, sectionId: sRaw } = await ctx.params;
  const gate = await requireLmsCourseCurriculumWrite(req, cRaw);
  if (!gate.ok) return gate.response;
  const { actor, courseId } = gate;
  const sectionId = parseLmsBigIntId(sRaw);
  if (sectionId == null) {
    return NextResponse.json({ ok: false, message: "Invalid section id." }, { status: 400 });
  }

  const section = await prisma.courseSection.findFirst({
    where: { id: sectionId, courseId, organizationId: actor.organizationId },
    select: { id: true },
  });
  if (!section) {
    return NextResponse.json({ ok: false, message: "Section not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ ok: false, message: "title is required." }, { status: 400 });
  }
  const lessonType = parseLessonType(body?.lessonType) ?? LmsDeliveryType.TEXT;

  const agg = await prisma.courseLesson.aggregate({
    where: { sectionId, courseId, organizationId: actor.organizationId },
    _max: { sortOrder: true },
  });
  const sortOrder = (agg._max.sortOrder ?? -1) + 1;

  const row = await prisma.courseLesson.create({
    data: {
      organizationId: actor.organizationId,
      courseId,
      sectionId,
      title: title.slice(0, 512),
      lessonType,
      sortOrder,
    },
  });

  return NextResponse.json({ ok: true, lesson: serializeLesson(row) });
}
