import "server-only";

import { filterValidRegistrations } from "@/lib/event-platform/command-center/command-center-registration";
import {
  DEFAULT_OPERATIONAL_TASKS,
  formatActivityEntry,
  type ActivityFilterCategory,
} from "@/lib/event-platform/event-operations/activity-constants";
import {
  buildOperationalAlerts,
  checklistCompletionMetric,
} from "@/lib/event-platform/event-operations/event-alert-engine";
import type {
  EventActivityRow,
  EventOperationsFilters,
  EventOperationsOverview,
  EventOperationalTaskDto,
} from "@/lib/event-platform/event-operations/event-operations-types";
import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import { parseDetailContent } from "@/lib/lms-events/event-detail-content";
import { prisma } from "@/lib/prisma";

export async function ensureDefaultOperationalTasks(organizationId: bigint, eventId: bigint): Promise<void> {
  for (const t of DEFAULT_OPERATIONAL_TASKS) {
    const existing = await prisma.eventOperationalTask.findFirst({
      where: { eventId, templateKey: t.templateKey },
    });
    if (existing) continue;
    await prisma.eventOperationalTask.create({
      data: {
        organizationId,
        eventId,
        templateKey: t.templateKey,
        title: t.title,
        category: t.category,
        status: "pending",
        isCustom: false,
      },
    });
  }
}

export async function getChecklistStats(organizationId: bigint, eventId: bigint) {
  await ensureDefaultOperationalTasks(organizationId, eventId);
  const tasks = await prisma.eventOperationalTask.findMany({
    where: { organizationId, eventId },
    include: {
      assignedTo: { select: { name: true } },
      completedBy: { select: { name: true } },
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
  const now = Date.now();
  const dtos: EventOperationalTaskDto[] = tasks.map((t) => ({
    id: t.id.toString(),
    templateKey: t.templateKey,
    title: t.title,
    category: t.category,
    status: t.status,
    assignedToId: t.assignedToId?.toString() ?? null,
    assignedToName: t.assignedTo?.name ?? null,
    dueAt: t.dueAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    completedByName: t.completedBy?.name ?? null,
    notes: t.notes,
    isCustom: t.isCustom,
    isOverdue: Boolean(t.dueAt && t.dueAt.getTime() < now && t.status !== "completed" && t.status !== "cancelled"),
  }));
  const completed = tasks.filter((t) => t.status === "completed").length;
  const overdue = dtos.filter((t) => t.isOverdue).length;
  const total = tasks.length;
  return {
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    completed,
    total,
    overdue,
    tasks: dtos,
    completionAvailability: checklistCompletionMetric(total > 0 ? Math.round((completed / total) * 100) : 0, total),
  };
}

async function loadActivityRows(
  organizationId: bigint,
  eventId: bigint,
  filters: EventOperationsFilters,
): Promise<EventActivityRow[]> {
  const logs = await prisma.eventAuditLog.findMany({
    where: {
      organizationId,
      OR: [
        { eventId },
        { entityType: "event", entityId: eventId.toString() },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const actorIds = [...new Set(logs.map((l) => l.actorUserId).filter(Boolean))] as bigint[];
  const actors =
    actorIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
      : [];
  const actorMap = new Map(actors.map((a) => [a.id.toString(), a.name]));

  let rows: EventActivityRow[] = logs.map((log) => {
    const meta =
      log.metadataJson && typeof log.metadataJson === "object"
        ? (log.metadataJson as Record<string, unknown>)
        : null;
    return formatActivityEntry({
      id: log.id.toString(),
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      createdAt: log.createdAt,
      actorName: log.actorUserId ? actorMap.get(log.actorUserId.toString()) ?? null : null,
      actorUserId: log.actorUserId,
      metadata: meta,
    });
  });

  const regs = await prisma.lmsEventRegistration.findMany({
    where: { organizationId, eventId, checkedInAt: { not: null } },
    select: { id: true, attendeeName: true, checkedInAt: true },
    orderBy: { checkedInAt: "desc" },
    take: 50,
  });
  for (const r of regs) {
    if (!r.checkedInAt) continue;
    rows.push(
      formatActivityEntry({
        id: `ci-${r.id}`,
        action: "registration.checked_in",
        entityType: "registration",
        entityId: r.id.toString(),
        createdAt: r.checkedInAt,
        actorName: null,
        metadata: { attendeeName: r.attendeeName, source: "registration" },
      }),
    );
  }

  rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom).getTime();
    rows = rows.filter((r) => new Date(r.timestamp).getTime() >= from);
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo).getTime();
    rows = rows.filter((r) => new Date(r.timestamp).getTime() <= to);
  }
  if (filters.category && filters.category !== "all") {
    rows = rows.filter((r) => r.category === filters.category);
  }
  if (filters.activityType?.trim()) {
    const t = filters.activityType.trim().toLowerCase();
    rows = rows.filter((r) => r.activityType.toLowerCase().includes(t) || r.activityLabel.toLowerCase().includes(t));
  }

  return rows;
}

export async function getEventOperationsOverview(
  organizationId: bigint,
  eventIdRaw: string,
  options?: {
    canManage?: boolean;
    canAssign?: boolean;
    currentUserId?: bigint;
    filters?: EventOperationsFilters;
  },
): Promise<EventOperationsOverview | null> {
  let eventId: bigint;
  try {
    eventId = BigInt(eventIdRaw);
  } catch {
    return null;
  }

  const filters = options?.filters ?? {};
  const event = await prisma.lmsTrainingEvent.findFirst({
    where: { id: eventId, organizationId },
    select: {
      id: true,
      startsAt: true,
      venueName: true,
      capacity: true,
      detailContent: true,
      hostInvitations: { select: { status: true } },
    },
  });
  if (!event) return null;

  const checklist = await getChecklistStats(organizationId, eventId);
  const activity = await loadActivityRows(organizationId, eventId, filters);

  const [registrations, rounds, plants, expenses, dismissals, plantRequests] = await Promise.all([
    prisma.lmsEventRegistration.findMany({
      where: { organizationId, eventId },
      select: { bookingStatus: true, paymentStatus: true },
    }),
    prisma.eventBingoRoundInstance.findMany({ where: { organizationId, eventId }, select: { assignedPrize: true } }),
    prisma.eventPlant.findMany({
      where: { organizationId, eventId, status: { not: "removed" } },
      select: { quantityPurchased: true, quantityAssigned: true, quantityAwarded: true, quantityRemoved: true },
    }),
    prisma.eventExpense.findMany({ where: { organizationId, eventId, category: { in: ["venue", "host"] } } }),
    prisma.eventAlertDismissal.findMany({ where: { organizationId, eventId }, select: { alertKey: true } }),
    prisma.eventPlantRequest.count({ where: { organizationId, eventId } }),
  ]);

  const validRegs = filterValidRegistrations(registrations);
  const hostConfirmed =
    event.hostInvitations.some((i) => i.status === "accepted") ||
    Boolean(parseDetailContent(event.detailContent)?.host?.name);
  const gamesCount = rounds.length;
  const gamesWithPrizes = rounds.filter((r) => r.assignedPrize?.trim()).length;
  const capacity = event.capacity;
  const regCount = validRegs.length;
  const remaining = capacity != null ? Math.max(0, capacity - regCount) : null;
  const paymentsOutstanding = validRegs.filter((r) => r.paymentStatus === "unpaid" || r.paymentStatus === "pending").length;
  const plantTotal = plants.reduce(
    (s, p) =>
      s + Math.max(0, p.quantityPurchased - p.quantityAssigned - p.quantityAwarded - p.quantityRemoved),
    0,
  );
  const plantReady = gamesCount === 0 ? true : plantTotal >= gamesCount;

  const venueExp = expenses.find((e) => e.category === "venue");
  const hostExp = expenses.find((e) => e.category === "host");
  const detail = parseDetailContent(event.detailContent);
  const sponsorExt = detail?.sponsor as { completedDeliverables?: string[]; deliverables?: string[] } | undefined;

  const alerts = buildOperationalAlerts({
    hostConfirmed,
    venueName: event.venueName,
    venueConfirmed: event.venueName ? "no_records" : "not_configured",
    gamesCount,
    gamesWithPrizes,
    remainingCapacity: { availability: capacity != null ? "available" : "not_configured", value: remaining },
    capacity,
    registrations: regCount,
    paymentsOutstanding,
    plantInventoryReady: plantReady ? "available" : "no_records",
    pendingCommissions: 0,
    startsAt: event.startsAt,
    hostPaymentPending: Boolean(hostExp && hostExp.paymentStatus !== "paid"),
    venuePaymentOverdue: Boolean(venueExp && venueExp.paymentStatus !== "paid"),
    plantDemandExceedsInventory: plantRequests > plantTotal && plantRequests > 0,
    sponsorDeliverablesIncomplete: Boolean(
      sponsorExt?.deliverables?.length &&
        (sponsorExt.completedDeliverables?.length ?? 0) < (sponsorExt.deliverables?.length ?? 0),
    ),
    dismissedKeys: new Set(dismissals.map((d) => d.alertKey)),
  });

  return {
    eventId: eventId.toString(),
    canManage: options?.canManage ?? false,
    canAssignTasks: options?.canAssign ?? false,
    canExport: true,
    currentUserId: options?.currentUserId?.toString() ?? null,
    filters,
    checklist: {
      percent: checklist.percent,
      completed: checklist.completed,
      total: checklist.total,
      overdue: checklist.overdue,
      tasks: checklist.tasks,
    },
    alerts,
    activity,
    activityTotal: activity.length,
  };
}

export function activityExportCsv(rows: EventActivityRow[]): string {
  const escape = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };
  const headers = ["Timestamp", "User", "Type", "Description", "Entity", "Source"];
  const lines = rows.map((r) =>
    [
      r.timestamp,
      r.userName ?? "",
      r.activityLabel,
      r.description,
      `${r.entityType}:${r.entityId ?? ""}`,
      r.source ?? "",
    ]
      .map(escape)
      .join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}

export async function runEventOperationsAction(params: {
  organizationId: bigint;
  eventId: bigint;
  actorUserId: bigint;
  action: string;
  body: Record<string, unknown>;
}): Promise<{ ok: boolean; message?: string }> {
  const { action, body } = params;

const CRITICAL_ALERT_KEYS = new Set(["no-venue", "host-critical-soon", "games-missing"]);

  if (action === "dismiss_alert" && typeof body.alertKey === "string") {
    const alertKey = body.alertKey.trim();
    if (CRITICAL_ALERT_KEYS.has(alertKey)) {
      return { ok: false, message: "Critical alerts cannot be dismissed while active." };
    }
    await prisma.eventAlertDismissal.upsert({
      where: { eventId_alertKey: { eventId: params.eventId, alertKey } },
      create: {
        organizationId: params.organizationId,
        eventId: params.eventId,
        alertKey,
        dismissedById: params.actorUserId,
      },
      update: { dismissedAt: new Date(), dismissedById: params.actorUserId },
    });
    return { ok: true };
  }

  if (action === "add_task") {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "Staff";
    if (!title) return { ok: false, message: "Title is required." };
    await prisma.eventOperationalTask.create({
      data: {
        organizationId: params.organizationId,
        eventId: params.eventId,
        title,
        category,
        status: "pending",
        isCustom: true,
        notes: typeof body.notes === "string" ? body.notes : null,
        dueAt: body.dueAt ? new Date(String(body.dueAt)) : null,
        createdById: params.actorUserId,
      },
    });
    return { ok: true };
  }

  if (action === "complete_task" && body.taskId) {
    const task = await prisma.eventOperationalTask.findFirst({
      where: { id: BigInt(String(body.taskId)), organizationId: params.organizationId, eventId: params.eventId },
    });
    if (!task) return { ok: false, message: "Task not found." };
    await prisma.eventOperationalTask.update({
      where: { id: task.id },
      data: { status: "completed", completedAt: new Date(), completedById: params.actorUserId, updatedAt: new Date() },
    });
    await writeEventAuditLog({
      organizationId: params.organizationId,
      eventId: params.eventId,
      actorUserId: params.actorUserId,
      action: "task.completed",
      entityType: "operational_task",
      entityId: task.id.toString(),
      metadata: { title: task.title },
    });
    return { ok: true };
  }

  if (action === "reopen_task" && body.taskId) {
    const task = await prisma.eventOperationalTask.findFirst({
      where: { id: BigInt(String(body.taskId)), organizationId: params.organizationId, eventId: params.eventId },
    });
    if (!task) return { ok: false, message: "Task not found." };
    await prisma.eventOperationalTask.update({
      where: { id: task.id },
      data: { status: "pending", completedAt: null, completedById: null, updatedAt: new Date() },
    });
    return { ok: true };
  }

  if (action === "assign_task" && body.taskId) {
    let assignedToId: bigint | null = null;
    if (body.assignedToId) {
      try {
        assignedToId = BigInt(String(body.assignedToId));
      } catch {
        return { ok: false, message: "Invalid assignee." };
      }
    }
    const task = await prisma.eventOperationalTask.findFirst({
      where: { id: BigInt(String(body.taskId)), organizationId: params.organizationId, eventId: params.eventId },
    });
    if (!task) return { ok: false, message: "Task not found." };
    await prisma.eventOperationalTask.update({
      where: { id: task.id },
      data: { assignedToId, updatedAt: new Date() },
    });
    return { ok: true };
  }

  if (action === "update_task_due" && body.taskId) {
    const task = await prisma.eventOperationalTask.findFirst({
      where: { id: BigInt(String(body.taskId)), organizationId: params.organizationId, eventId: params.eventId },
    });
    if (!task) return { ok: false, message: "Task not found." };
    await prisma.eventOperationalTask.update({
      where: { id: task.id },
      data: {
        dueAt: body.dueAt ? new Date(String(body.dueAt)) : null,
        notes: typeof body.notes === "string" ? body.notes : task.notes,
        updatedAt: new Date(),
      },
    });
    return { ok: true };
  }

  if (action === "delete_task" && body.taskId) {
    const task = await prisma.eventOperationalTask.findFirst({
      where: { id: BigInt(String(body.taskId)), organizationId: params.organizationId, eventId: params.eventId, isCustom: true },
    });
    if (!task) return { ok: false, message: "Only custom tasks can be deleted." };
    await prisma.eventOperationalTask.delete({ where: { id: task.id } });
    return { ok: true };
  }

  return { ok: false, message: "Unknown action." };
}

export { checklistCompletionMetric };
