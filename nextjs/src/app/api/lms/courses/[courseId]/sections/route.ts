import { NextRequest, NextResponse } from "next/server";

import { serializeSection } from "@/lib/lms-course-content-serialize";
import { requireLmsCourseCurriculumWrite } from "@/lib/lms-course-write-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
  const { courseId: raw } = await ctx.params;
  const gate = await requireLmsCourseCurriculumWrite(req, raw);
  if (!gate.ok) return gate.response;
  const { actor, courseId } = gate;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ ok: false, message: "title is required." }, { status: 400 });
  }
  const description = typeof body?.description === "string" ? body.description.trim() || null : null;

  const agg = await prisma.courseSection.aggregate({
    where: { courseId, organizationId: actor.organizationId },
    _max: { sortOrder: true },
  });
  const sortOrder = (agg._max.sortOrder ?? -1) + 1;

  const row = await prisma.courseSection.create({
    data: {
      organizationId: actor.organizationId,
      courseId,
      title: title.slice(0, 512),
      description,
      sortOrder,
    },
    include: { lessons: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
  });

  return NextResponse.json({ ok: true, section: serializeSection(row) });
}
