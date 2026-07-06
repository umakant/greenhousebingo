import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import {
  logComplianceActivity,
  loadOwner,
  serializeAttachment,
  serializeComment,
  serializeTask,
} from "@/lib/compliance/compliance-service";
import {
  dueDateRelative,
  taskAssigneeName,
  taskCategory,
  taskCreatedBy,
  taskDescription,
  taskDisplayStatus,
  taskNotes,
  taskProgressPct,
  taskProgressSteps,
  taskRelatedLink,
  taskSubtasks,
  taskSubtitle,
} from "@/lib/compliance/compliance-tasks";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function enrichTaskDetail(
  base: ReturnType<typeof serializeTask>,
  actorName: string | null,
) {
  const category = taskCategory(base.title, base.entityType, base.id);
  const displayStatus = taskDisplayStatus(base.status, base.dueDate);
  const assigneeName = taskAssigneeName(base.id, base.assigneeName);
  const subtasks = taskSubtasks(base.id, base.status, displayStatus);
  return {
    ...base,
    category,
    subtitle: taskSubtitle(base.title, base.entityType, base.id, category),
    displayStatus,
    assigneeName,
    description: taskDescription(base.title, category),
    dueIn: dueDateRelative(base.dueDate),
    progressPct: taskProgressPct(base.status, displayStatus, base.id),
    progressSteps: taskProgressSteps(base.status, displayStatus, base.id),
    subtasks,
    subtaskCount: subtasks.length,
    createdByName: taskCreatedBy(base.id),
    notes: taskNotes(base.id),
    relatedLink: taskRelatedLink(base.entityType, base.entityId, base.title),
  };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-tasks");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const row = await prisma.complianceTask.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!row) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const [assignee, comments, attachments] = await Promise.all([
    loadOwner(row.assigneeUserId),
    prisma.complianceComment.findMany({
      where: { organizationId: gate.actor.organizationId, entityType: "task", entityId: row.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.complianceAttachment.findMany({
      where: { organizationId: gate.actor.organizationId, entityType: "task", entityId: row.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const item = enrichTaskDetail(
    serializeTask({
      ...row,
      assignee,
      commentCount: comments.length,
      attachmentCount: attachments.length,
    }),
    gate.actor.name,
  );

  return NextResponse.json({
    ok: true,
    item,
    comments: comments.map(serializeComment),
    attachments: attachments.map(serializeAttachment),
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-tasks");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const existing = await prisma.complianceTask.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const row = await prisma.complianceTask.update({
    where: { id: existing.id },
    data: {
      ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
      ...(body.status !== undefined ? { status: String(body.status).trim() } : {}),
      ...(body.priority !== undefined ? { priority: String(body.priority).trim() } : {}),
      ...(body.dueDate !== undefined
        ? { dueDate: body.dueDate ? new Date(String(body.dueDate)) : null }
        : {}),
      ...(body.assigneeUserId !== undefined
        ? { assigneeUserId: body.assigneeUserId ? BigInt(Number(body.assigneeUserId)) : null }
        : {}),
      updatedAt: new Date(),
    },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "task_updated",
    entityType: "task",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  const assignee = await loadOwner(row.assigneeUserId);
  return NextResponse.json({
    ok: true,
    item: enrichTaskDetail(serializeTask({ ...row, assignee }), gate.actor.name),
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-tasks");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const existing = await prisma.complianceTask.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: true });

  await prisma.complianceTask.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
