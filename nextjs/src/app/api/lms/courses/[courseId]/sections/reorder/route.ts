import { NextRequest, NextResponse } from "next/server";

import { parseLmsBigIntId, requireLmsCourseCurriculumWrite } from "@/lib/lms-course-write-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Body: `{ "sectionIds": ["1","2",...] }` — full ordered list for the course. */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) {
  const { courseId: raw } = await ctx.params;
  const gate = await requireLmsCourseCurriculumWrite(req, raw);
  if (!gate.ok) return gate.response;
  const { actor, courseId } = gate;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const idsRaw = body?.sectionIds;
  if (!Array.isArray(idsRaw) || idsRaw.length === 0) {
    return NextResponse.json({ ok: false, message: "sectionIds array is required." }, { status: 400 });
  }
  const ids = idsRaw.map((x) => (typeof x === "string" ? parseLmsBigIntId(x) : null)).filter((x): x is bigint => x != null);
  if (ids.length !== idsRaw.length) {
    return NextResponse.json({ ok: false, message: "Invalid section id in list." }, { status: 400 });
  }

  const existing = await prisma.courseSection.findMany({
    where: { courseId, organizationId: actor.organizationId },
    select: { id: true },
  });
  const set = new Set(existing.map((e) => e.id.toString()));
  if (existing.length !== ids.length || !ids.every((id) => set.has(id.toString()))) {
    return NextResponse.json({ ok: false, message: "sectionIds must list every section exactly once." }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.courseSection.update({
        where: { id, courseId, organizationId: actor.organizationId },
        data: { sortOrder: i },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
