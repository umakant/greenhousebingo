import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import { serializeComment } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-tasks");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const task = await prisma.complianceTask.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!task) return NextResponse.json({ ok: false, message: "Task not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const commentBody = String(body.body ?? "").trim();
  if (!commentBody) return NextResponse.json({ ok: false, message: "Comment body required." }, { status: 400 });

  const row = await prisma.complianceComment.create({
    data: {
      organizationId: gate.actor.organizationId,
      entityType: "task",
      entityId: task.id,
      body: commentBody,
      authorUserId: gate.actor.userId,
      authorName: gate.actor.name ?? gate.actor.email,
    },
  });

  return NextResponse.json({ ok: true, item: serializeComment(row) });
}
