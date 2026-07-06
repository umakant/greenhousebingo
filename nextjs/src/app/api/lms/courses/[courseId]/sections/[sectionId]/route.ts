import { NextRequest, NextResponse } from "next/server";

import { serializeSection } from "@/lib/lms-course-content-serialize";
import { parseLmsBigIntId, requireLmsCourseCurriculumWrite } from "@/lib/lms-course-write-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ courseId: string; sectionId: string }> }) {
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
  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const data: { title?: string; description?: string | null } = {};
  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t) {
      return NextResponse.json({ ok: false, message: "title cannot be empty." }, { status: 400 });
    }
    data.title = t.slice(0, 512);
  }
  if (typeof body.description === "string") {
    data.description = body.description.trim() || null;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, message: "No valid fields to update." }, { status: 400 });
  }

  const row = await prisma.courseSection.update({
    where: { id: sectionId, courseId, organizationId: actor.organizationId },
    data: { ...data, updatedAt: new Date() },
    include: { lessons: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
  });

  return NextResponse.json({ ok: true, section: serializeSection(row) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ courseId: string; sectionId: string }> }) {
  const { courseId: cRaw, sectionId: sRaw } = await ctx.params;
  const gate = await requireLmsCourseCurriculumWrite(req, cRaw);
  if (!gate.ok) return gate.response;
  const { actor, courseId } = gate;
  const sectionId = parseLmsBigIntId(sRaw);
  if (sectionId == null) {
    return NextResponse.json({ ok: false, message: "Invalid section id." }, { status: 400 });
  }

  const del = await prisma.courseSection.deleteMany({
    where: { id: sectionId, courseId, organizationId: actor.organizationId },
  });
  if (del.count === 0) {
    return NextResponse.json({ ok: false, message: "Section not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}