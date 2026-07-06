import { NextRequest, NextResponse } from "next/server";

import { parseLmsBigIntId, requireLmsCourseCurriculumWrite } from "@/lib/lms-course-write-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Body: `{ "lessonIds": ["1","2",...] }` — full order within this section. */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ courseId: string; sectionId: string }> }) {
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
  const idsRaw = body?.lessonIds;
  if (!Array.isArray(idsRaw) || idsRaw.length === 0) {
    return NextResponse.json({ ok: false, message: "lessonIds array is required." }, { status: 400 });
  }
  const ids = idsRaw.map((x) => (typeof x === "string" ? parseLmsBigIntId(x) : null)).filter((x): x is bigint => x != null);
  if (ids.length !== idsRaw.length) {
    return NextResponse.json({ ok: false, message: "Invalid lesson id in list." }, { status: 400 });
  }

  const existing = await prisma.courseLesson.findMany({
    where: { sectionId, courseId, organizationId: actor.organizationId },
    select: { id: true },
  });
  const set = new Set(existing.map((e) => e.id.toString()));
  if (existing.length !== ids.length || !ids.every((id) => set.has(id.toString()))) {
    return NextResponse.json({ ok: false, message: "lessonIds must list every lesson in this section exactly once." }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.courseLesson.update({
        where: { id, sectionId, courseId, organizationId: actor.organizationId },
        data: { sortOrder: i, updatedAt: new Date() },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
