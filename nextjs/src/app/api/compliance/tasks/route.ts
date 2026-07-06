import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import { logComplianceActivity, loadOwner, serializeTask } from "@/lib/compliance/compliance-service";
import {
  dueDateRelative,
  taskAssigneeName,
  taskCategory,
  taskDescription,
  taskDisplayStatus,
  taskProgressPct,
  taskRelatedLink,
  taskStats,
  taskSubtitle,
} from "@/lib/compliance/compliance-tasks";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function enrichTask(base: ReturnType<typeof serializeTask>) {
  const category = taskCategory(base.title, base.entityType, base.id);
  const displayStatus = taskDisplayStatus(base.status, base.dueDate);
  const assigneeName = taskAssigneeName(base.id, base.assigneeName);
  return {
    ...base,
    category,
    subtitle: taskSubtitle(base.title, base.entityType, base.id, category),
    displayStatus,
    assigneeName,
    description: taskDescription(base.title, category),
    dueIn: dueDateRelative(base.dueDate),
    progressPct: taskProgressPct(base.status, displayStatus, base.id),
    relatedLink: taskRelatedLink(base.entityType, base.entityId, base.title),
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-tasks");
  if (!gate.ok) return gate.response;

  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const priority = (req.nextUrl.searchParams.get("priority") ?? "").trim();
  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const owner = (req.nextUrl.searchParams.get("owner") ?? "").trim();
  const category = (req.nextUrl.searchParams.get("category") ?? "").trim();
  const entityType = (req.nextUrl.searchParams.get("entityType") ?? "").trim();

  const rows = await prisma.complianceTask.findMany({
    where: {
      organizationId: gate.actor.organizationId,
      ...(status && status !== "all" ? { status } : {}),
      ...(priority && priority !== "all" ? { priority } : {}),
      ...(entityType ? { entityType } : {}),
      ...(search
        ? {
            title: { contains: search, mode: "insensitive" },
          }
        : {}),
    },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
    take: 300,
  });

  let items = await Promise.all(
    rows.map(async (row) => {
      const [assignee, commentCount, attachmentCount] = await Promise.all([
        loadOwner(row.assigneeUserId),
        prisma.complianceComment.count({
          where: {
            organizationId: gate.actor.organizationId,
            entityType: "task",
            entityId: row.id,
          },
        }),
        prisma.complianceAttachment.count({
          where: {
            organizationId: gate.actor.organizationId,
            entityType: "task",
            entityId: row.id,
          },
        }),
      ]);
      return enrichTask(
        serializeTask({ ...row, assignee, commentCount, attachmentCount }),
      );
    }),
  );

  if (owner && owner !== "all") {
    items = items.filter((i) => i.assigneeName === owner);
  }
  if (category && category !== "all") {
    items = items.filter((i) => i.category === category);
  }
  if (status === "overdue") {
    items = items.filter((i) => i.displayStatus === "overdue");
  } else if (status === "due_soon") {
    items = items.filter((i) => i.displayStatus === "due_soon");
  } else if (status === "open") {
    items = items.filter((i) => i.displayStatus === "open");
  } else if (status === "in_progress") {
    items = items.filter((i) => i.displayStatus === "in_progress" || i.status === "in_progress");
  } else if (status === "done") {
    items = items.filter((i) => i.displayStatus === "done");
  }

  const owners = [...new Set(items.map((i) => i.assigneeName).filter(Boolean))].sort();
  const categories = [...new Set(items.map((i) => i.category))].sort();
  const stats = taskStats(items);

  return NextResponse.json({ ok: true, items, stats, owners, categories });
}

export async function POST(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-tasks");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ ok: false, message: "Title is required." }, { status: 400 });

  const row = await prisma.complianceTask.create({
    data: {
      organizationId: gate.actor.organizationId,
      title,
      status: String(body.status ?? "open").trim() || "open",
      priority: String(body.priority ?? "medium").trim() || "medium",
      dueDate: body.dueDate ? new Date(String(body.dueDate)) : null,
      assigneeUserId: body.assigneeUserId ? BigInt(Number(body.assigneeUserId)) : null,
      entityType: body.entityType ? String(body.entityType).trim() : null,
      entityId: body.entityId ? BigInt(Number(body.entityId)) : null,
    },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "task_created",
    entityType: "task",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  const assignee = await loadOwner(row.assigneeUserId);
  return NextResponse.json({ ok: true, item: enrichTask(serializeTask({ ...row, assignee })) });
}
