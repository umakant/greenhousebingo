import "server-only";

import { Prisma } from "@prisma/client";

import {
  LOW_STOCK_THRESHOLD,
  type EventPlantStatus,
} from "@/lib/event-platform/event-plants/event-plant-constants";
import type {
  CreateEventPlantInput,
  CreatePlantRequestInput,
  EventPlantAssignmentDto,
  EventPlantDetail,
  EventPlantDto,
  EventPlantRequestDto,
  EventPlantsOverview,
  UpdateEventPlantInput,
} from "@/lib/event-platform/event-plants/event-plant-types";
import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import { prisma } from "@/lib/prisma";

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

function clampNonNegative(n: number): number {
  return Math.max(0, n);
}

function quantityRemaining(row: {
  quantityPurchased: number;
  quantityAwarded: number;
  quantityRemoved: number;
}): number {
  return clampNonNegative(row.quantityPurchased - row.quantityAwarded - row.quantityRemoved);
}

function deriveStatus(row: {
  status: string;
  quantityPurchased: number;
  quantityAssigned: number;
  quantityAwarded: number;
  quantityRemoved: number;
}): EventPlantStatus {
  if (row.status === "removed") return "removed";
  const remaining = quantityRemaining(row);
  if (remaining === 0) return "out_of_stock";
  if (remaining <= LOW_STOCK_THRESHOLD) return "low_stock";
  if (row.quantityAwarded > 0 && row.quantityAwarded >= row.quantityPurchased - row.quantityRemoved) {
    return "awarded";
  }
  if (row.quantityAssigned > 0) return "assigned";
  return "available";
}

type PlantRow = Prisma.EventPlantGetPayload<{
  include: { eventVendor: { select: { vendorName: true } }; assignments: { include: { roundInstance: true } } };
}>;

type PopularityContext = {
  currentRequests: Map<string, number>;
  historicalRequests: Map<string, number>;
  historicalAssignments: Map<string, number>;
  historicalWins: Map<string, number>;
  hasHistorical: boolean;
};

function plantKey(name: string): string {
  return name.trim().toLowerCase();
}

function computePopularity(
  plantName: string,
  plantId: string,
  ctx: PopularityContext,
): { score: number; label: string } {
  const key = plantKey(plantName);
  const current = ctx.currentRequests.get(plantId) ?? ctx.currentRequests.get(key) ?? 0;

  if (!ctx.hasHistorical) {
    return { score: Math.min(100, current * 10), label: "Current Event Demand" };
  }

  const histReq = ctx.historicalRequests.get(key) ?? 0;
  const histAssign = ctx.historicalAssignments.get(key) ?? 0;
  const histWins = ctx.historicalWins.get(key) ?? 0;
  const maxCurrent = Math.max(1, ...[...ctx.currentRequests.values()]);
  const maxHistReq = Math.max(1, ...[...ctx.historicalRequests.values()], 1);
  const maxHistAssign = Math.max(1, ...[...ctx.historicalAssignments.values()], 1);
  const maxHistWins = Math.max(1, ...[...ctx.historicalWins.values()], 1);

  const score = Math.round(
    0.5 * (current / maxCurrent) * 100 +
      0.2 * (histReq / maxHistReq) * 100 +
      0.15 * (histAssign / maxHistAssign) * 100 +
      0.15 * (histWins / maxHistWins) * 100,
  );
  return { score: Math.min(100, score), label: "Weighted popularity" };
}

function serializePlant(
  row: PlantRow,
  requestCount: number,
  popularity: { score: number; label: string },
): EventPlantDto {
  const remaining = quantityRemaining(row);
  const activeAssignment = row.assignments.find((a) => a.status !== "cancelled");
  return {
    id: row.id.toString(),
    eventId: row.eventId.toString(),
    name: row.name,
    category: row.category,
    variety: row.variety,
    description: row.description,
    imageUrl: row.imageUrl,
    supplierName: row.eventVendor?.vendorName ?? null,
    posProductId: row.posProductId?.toString() ?? null,
    quantityPurchased: row.quantityPurchased,
    quantityAssigned: row.quantityAssigned,
    quantityAwarded: row.quantityAwarded,
    quantityRemoved: row.quantityRemoved,
    quantityRemaining: remaining,
    unitCost: num(row.unitCost),
    totalCost: Math.round(row.quantityPurchased * num(row.unitCost) * 100) / 100,
    retailValue: row.retailValue != null ? num(row.retailValue) : null,
    requestCount,
    inventoryGap: Math.max(0, requestCount - remaining),
    popularityScore: popularity.score,
    popularityLabel: popularity.label,
    assignedGameLabel: activeAssignment?.roundInstance
      ? `Round ${activeAssignment.roundInstance.roundNumber}: ${activeAssignment.roundInstance.name}`
      : null,
    status: deriveStatus(row),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

async function buildPopularityContext(
  organizationId: bigint,
  eventId: bigint,
  plants: Array<{ id: bigint; name: string }>,
  requestRows: Array<{ eventPlantId: bigint | null; requestedPlantName: string | null }>,
): Promise<PopularityContext> {
  const currentRequests = new Map<string, number>();
  for (const req of requestRows) {
    if (req.eventPlantId) {
      const id = req.eventPlantId.toString();
      currentRequests.set(id, (currentRequests.get(id) ?? 0) + 1);
    }
    if (req.requestedPlantName?.trim()) {
      const key = plantKey(req.requestedPlantName);
      currentRequests.set(key, (currentRequests.get(key) ?? 0) + 1);
    }
  }

  const plantNames = plants.map((p) => p.name);
  const [histRequests, histAssignments, histWinners] = await Promise.all([
    prisma.eventPlantRequest.findMany({
      where: { organizationId, eventId: { not: eventId } },
      select: { requestedPlantName: true, eventPlant: { select: { name: true } } },
      take: 500,
    }),
    prisma.eventPlantAssignment.findMany({
      where: { organizationId, eventId: { not: eventId } },
      select: { eventPlant: { select: { name: true } } },
      take: 500,
    }),
    prisma.eventBingoWinner.findMany({
      where: { organizationId, eventId: { not: eventId }, invalidated: false },
      select: { prizeLabel: true },
      take: 500,
    }),
  ]);

  const hasHistorical =
    histRequests.length > 0 || histAssignments.length > 0 || histWinners.length > 0;

  const historicalRequests = new Map<string, number>();
  for (const r of histRequests) {
    const name = r.eventPlant?.name ?? r.requestedPlantName;
    if (!name) continue;
    const key = plantKey(name);
    historicalRequests.set(key, (historicalRequests.get(key) ?? 0) + 1);
  }

  const historicalAssignments = new Map<string, number>();
  for (const a of histAssignments) {
    const key = plantKey(a.eventPlant.name);
    historicalAssignments.set(key, (historicalAssignments.get(key) ?? 0) + 1);
  }

  const historicalWins = new Map<string, number>();
  for (const w of histWinners) {
    const key = plantKey(w.prizeLabel);
    if (plantNames.some((n) => plantKey(n) === key)) {
      historicalWins.set(key, (historicalWins.get(key) ?? 0) + 1);
    }
  }

  return { currentRequests, historicalRequests, historicalAssignments, historicalWins, hasHistorical };
}

async function syncAwardedFromWinners(organizationId: bigint, eventId: bigint): Promise<void> {
  const [plants, winners] = await Promise.all([
    prisma.eventPlant.findMany({
      where: { organizationId, eventId, status: { not: "removed" } },
    }),
    prisma.eventBingoWinner.findMany({
      where: { organizationId, eventId, invalidated: false, verified: true },
      select: { prizeLabel: true },
    }),
  ]);

  const winCounts = new Map<string, number>();
  for (const w of winners) {
    const key = plantKey(w.prizeLabel);
    winCounts.set(key, (winCounts.get(key) ?? 0) + 1);
  }

  for (const plant of plants) {
    const awarded = winCounts.get(plantKey(plant.name)) ?? 0;
    if (awarded !== plant.quantityAwarded) {
      await prisma.eventPlant.update({
        where: { id: plant.id },
        data: {
          quantityAwarded: Math.min(plant.quantityPurchased - plant.quantityRemoved, awarded),
        },
      });
    }
  }
}

function buildSummary(plants: EventPlantDto[]): EventPlantsOverview["summary"] {
  const active = plants.filter((p) => p.status !== "removed");
  const totalPurchased = active.reduce((s, p) => s + p.quantityPurchased, 0);
  const totalCost = active.reduce((s, p) => s + p.totalCost, 0);
  return {
    totalPlants: active.length,
    totalPlantCost: Math.round(totalCost * 100) / 100,
    averageUnitCost:
      totalPurchased > 0
        ? Math.round((active.reduce((s, p) => s + p.unitCost * p.quantityPurchased, 0) / totalPurchased) * 100) /
          100
        : 0,
    estimatedRetailValue:
      Math.round(active.reduce((s, p) => s + (p.retailValue ?? 0) * p.quantityPurchased, 0) * 100) / 100,
    plantsAssignedToGames: active.reduce((s, p) => s + p.quantityAssigned, 0),
    plantsAwarded: active.reduce((s, p) => s + p.quantityAwarded, 0),
    plantsRemaining: active.reduce((s, p) => s + p.quantityRemaining, 0),
    requestedPlantsAvailable: active.filter((p) => p.requestCount > 0 && p.quantityRemaining > 0).length,
    inventoryGaps: active.filter((p) => p.inventoryGap > 0).length,
  };
}

function buildAnalytics(plants: EventPlantDto[]): EventPlantsOverview["analytics"] {
  const active = plants.filter((p) => p.status !== "removed");
  const byCategory = new Map<string, { count: number; cost: number }>();
  for (const p of active) {
    const cat = p.category?.trim() || "Uncategorized";
    const entry = byCategory.get(cat) ?? { count: 0, cost: 0 };
    entry.count += p.requestCount;
    entry.cost += p.totalCost;
    byCategory.set(cat, entry);
  }

  return {
    requestsByCategory: [...byCategory.entries()].map(([key, v]) => ({ key, label: key, count: v.count })),
    inventoryVsRequests: active.map((p) => ({
      label: p.name.length > 24 ? `${p.name.slice(0, 24)}…` : p.name,
      inventory: p.quantityRemaining,
      requests: p.requestCount,
    })),
    costByCategory: [...byCategory.entries()].map(([key, v]) => ({
      key,
      label: key,
      cost: Math.round(v.cost * 100) / 100,
    })),
    mostPopular: [...active]
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, 8)
      .map((p) => ({ label: p.name, score: p.popularityScore, requestCount: p.requestCount })),
    inventoryBreakdown: {
      assigned: active.reduce((s, p) => s + p.quantityAssigned, 0),
      awarded: active.reduce((s, p) => s + p.quantityAwarded, 0),
      remaining: active.reduce((s, p) => s + p.quantityRemaining, 0),
    },
  };
}

export async function getEventPlantsOverview(
  organizationId: bigint,
  eventIdRaw: string,
  options?: { canManagePlants?: boolean },
): Promise<EventPlantsOverview | null> {
  let eventId: bigint;
  try {
    eventId = BigInt(eventIdRaw);
  } catch {
    return null;
  }

  const event = await prisma.lmsTrainingEvent.findFirst({
    where: { id: eventId, organizationId },
    select: { id: true },
  });
  if (!event) return null;

  await syncAwardedFromWinners(organizationId, eventId);

  const [plantRows, requestRows, roundRows, auditRows] = await Promise.all([
    prisma.eventPlant.findMany({
      where: { organizationId, eventId },
      include: {
        eventVendor: { select: { vendorName: true } },
        assignments: { include: { roundInstance: true }, where: { status: { not: "cancelled" } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.eventPlantRequest.findMany({
      where: { organizationId, eventId },
      include: {
        registration: { select: { attendeeName: true, attendeeEmail: true } },
        eventPlant: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.eventBingoRoundInstance.findMany({
      where: { organizationId, eventId },
      select: { id: true, roundNumber: true, name: true, assignedPrize: true },
      orderBy: { roundNumber: "asc" },
    }),
    prisma.eventAuditLog.findMany({
      where: {
        organizationId,
        entityType: { in: ["event_plant", "event_plant_request", "event_plant_assignment"] },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const popularityCtx = await buildPopularityContext(
    organizationId,
    eventId,
    plantRows.map((p) => ({ id: p.id, name: p.name })),
    requestRows,
  );

  const requestCountByPlant = new Map<string, number>();
  for (const req of requestRows) {
    if (req.eventPlantId) {
      const id = req.eventPlantId.toString();
      requestCountByPlant.set(id, (requestCountByPlant.get(id) ?? 0) + 1);
    }
  }

  const plants = plantRows.map((row) => {
    const reqCount = requestCountByPlant.get(row.id.toString()) ?? 0;
    const pop = computePopularity(row.name, row.id.toString(), popularityCtx);
    return serializePlant(row, reqCount, pop);
  });

  const requests: EventPlantRequestDto[] = requestRows.map((r) => ({
    id: r.id.toString(),
    eventId: r.eventId.toString(),
    registrationId: r.registrationId.toString(),
    attendeeName: r.registration.attendeeName,
    attendeeEmail: r.registration.attendeeEmail,
    eventPlantId: r.eventPlantId?.toString() ?? null,
    plantName: r.eventPlant?.name ?? r.requestedPlantName ?? "—",
    priority: r.priority,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  }));

  const gaps = plants
    .filter((p) => p.inventoryGap > 0 && p.status !== "removed")
    .map((p) => ({
      plantId: p.id,
      plantName: p.name,
      requestCount: p.requestCount,
      available: p.quantityRemaining,
      inventoryGap: p.inventoryGap,
    }))
    .sort((a, b) => b.inventoryGap - a.inventoryGap);

  const activity = auditRows
    .filter((log) => {
      if (!log.metadataJson) return true;
      const meta =
        typeof log.metadataJson === "string"
          ? log.metadataJson
          : JSON.stringify(log.metadataJson);
      return meta.includes(eventIdRaw);
    })
    .map((log) => ({
      id: log.id.toString(),
      at: log.createdAt.toISOString(),
      action: log.action,
      title: log.action.replace(/\./g, " "),
      detail: log.entityType.replace(/_/g, " "),
    }));

  return {
    summary: buildSummary(plants),
    plants,
    requests,
    gaps,
    analytics: buildAnalytics(plants),
    activity,
    rounds: roundRows.map((r) => ({
      id: r.id.toString(),
      roundNumber: r.roundNumber,
      name: r.name,
      assignedPrize: r.assignedPrize,
    })),
    canManagePlants: options?.canManagePlants ?? false,
  };
}

export async function getEventPlantDetail(
  organizationId: bigint,
  eventId: bigint,
  plantId: bigint,
): Promise<EventPlantDetail | null> {
  const row = await prisma.eventPlant.findFirst({
    where: { id: plantId, organizationId, eventId },
    include: {
      eventVendor: { select: { vendorName: true } },
      assignments: { include: { roundInstance: true } },
      requests: { include: { registration: { select: { attendeeName: true, attendeeEmail: true } } } },
    },
  });
  if (!row) return null;

  const popCtx = await buildPopularityContext(
    organizationId,
    eventId,
    [{ id: row.id, name: row.name }],
    row.requests,
  );
  const pop = computePopularity(row.name, row.id.toString(), popCtx);
  const plant = serializePlant(row, row.requests.length, pop);

  return {
    plant,
    assignments: row.assignments.map((a) => ({
      id: a.id.toString(),
      eventPlantId: a.eventPlantId.toString(),
      plantName: row.name,
      roundInstanceId: a.roundInstanceId?.toString() ?? null,
      roundNumber: a.roundInstance?.roundNumber ?? null,
      roundName: a.roundInstance?.name ?? null,
      bingoGameId: a.bingoGameId?.toString() ?? null,
      quantity: a.quantity,
      status: a.status,
      assignedAt: a.assignedAt.toISOString(),
    })),
    requests: row.requests.map((r) => ({
      id: r.id.toString(),
      eventId: r.eventId.toString(),
      registrationId: r.registrationId.toString(),
      attendeeName: r.registration.attendeeName,
      attendeeEmail: r.registration.attendeeEmail,
      eventPlantId: r.eventPlantId?.toString() ?? null,
      plantName: row.name,
      priority: r.priority,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    })),
    activity: [],
  };
}

async function validateProductRef(organizationId: bigint, posProductId?: string | null): Promise<boolean> {
  if (!posProductId) return true;
  try {
    const id = BigInt(posProductId);
    const product = await prisma.posProduct.findFirst({ where: { id, organizationId }, select: { id: true } });
    return Boolean(product);
  } catch {
    return false;
  }
}

export async function createEventPlant(input: {
  organizationId: bigint;
  eventId: bigint;
  data: CreateEventPlantInput;
  actorUserId?: bigint;
}): Promise<EventPlantDto | null> {
  const name = input.data.name.trim();
  if (!name) return null;
  if (!(await validateProductRef(input.organizationId, input.data.posProductId))) return null;

  let eventVendorId: bigint | null = null;
  if (input.data.eventVendorId) {
    try {
      const vid = BigInt(input.data.eventVendorId);
      const vendor = await prisma.eventVendor.findFirst({ where: { id: vid, organizationId: input.organizationId } });
      if (vendor) eventVendorId = vid;
    } catch {
      /* ignore */
    }
  }

  const row = await prisma.eventPlant.create({
    data: {
      organizationId: input.organizationId,
      eventId: input.eventId,
      name,
      category: input.data.category?.trim() || null,
      variety: input.data.variety?.trim() || null,
      description: input.data.description?.trim() || null,
      imageUrl: input.data.imageUrl?.trim() || null,
      eventVendorId,
      posProductId: input.data.posProductId
        ? (() => {
            try {
              return BigInt(input.data.posProductId);
            } catch {
              return null;
            }
          })()
        : null,
      quantityPurchased: clampNonNegative(input.data.quantityPurchased ?? 0),
      unitCost: clampNonNegative(input.data.unitCost ?? 0),
      retailValue: input.data.retailValue ?? null,
      notes: input.data.notes?.trim() || null,
      createdById: input.actorUserId ?? null,
      updatedById: input.actorUserId ?? null,
    },
    include: {
      eventVendor: { select: { vendorName: true } },
      assignments: { include: { roundInstance: true } },
    },
  });

  await writeEventAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "plant.added",
    entityType: "event_plant",
    entityId: row.id.toString(),
    metadata: { eventId: input.eventId.toString(), name },
  });

  return serializePlant(row, 0, { score: 0, label: "Current Event Demand" });
}

export async function updateEventPlant(input: {
  organizationId: bigint;
  eventId: bigint;
  plantId: bigint;
  data: UpdateEventPlantInput;
  actorUserId?: bigint;
}): Promise<EventPlantDto | null> {
  const existing = await prisma.eventPlant.findFirst({
    where: { id: input.plantId, organizationId: input.organizationId, eventId: input.eventId },
  });
  if (!existing || existing.status === "removed") return null;

  const qtyPurchased =
    input.data.quantityPurchased != null
      ? clampNonNegative(input.data.quantityPurchased)
      : existing.quantityPurchased;
  const qtyRemoved =
    input.data.quantityRemoved != null ? clampNonNegative(input.data.quantityRemoved) : existing.quantityRemoved;
  if (existing.quantityAwarded > qtyPurchased - qtyRemoved) {
    throw new Error("Awarded quantity cannot exceed purchased minus removed.");
  }

  const row = await prisma.eventPlant.update({
    where: { id: existing.id },
    data: {
      name: input.data.name?.trim() || existing.name,
      category: input.data.category !== undefined ? input.data.category?.trim() || null : existing.category,
      variety: input.data.variety !== undefined ? input.data.variety?.trim() || null : existing.variety,
      description:
        input.data.description !== undefined ? input.data.description?.trim() || null : existing.description,
      imageUrl: input.data.imageUrl !== undefined ? input.data.imageUrl?.trim() || null : existing.imageUrl,
      quantityPurchased: qtyPurchased,
      quantityRemoved: qtyRemoved,
      unitCost: input.data.unitCost != null ? clampNonNegative(input.data.unitCost) : existing.unitCost,
      retailValue: input.data.retailValue !== undefined ? input.data.retailValue : existing.retailValue,
      notes: input.data.notes !== undefined ? input.data.notes?.trim() || null : existing.notes,
      status: input.data.status ?? existing.status,
      updatedById: input.actorUserId ?? null,
    },
    include: {
      eventVendor: { select: { vendorName: true } },
      assignments: { include: { roundInstance: true } },
    },
  });

  await writeEventAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "plant.updated",
    entityType: "event_plant",
    entityId: row.id.toString(),
    metadata: { eventId: input.eventId.toString() },
  });

  const reqCount = await prisma.eventPlantRequest.count({ where: { eventPlantId: row.id } });
  return serializePlant(row, reqCount, { score: reqCount * 10, label: "Current Event Demand" });
}

export async function addPlantQuantity(input: {
  organizationId: bigint;
  eventId: bigint;
  plantId: bigint;
  quantity: number;
  actorUserId?: bigint;
}): Promise<EventPlantDto | null> {
  const qty = clampNonNegative(input.quantity);
  if (qty <= 0) throw new Error("Quantity must be positive.");

  const existing = await prisma.eventPlant.findFirst({
    where: {
      id: input.plantId,
      organizationId: input.organizationId,
      eventId: input.eventId,
      status: { not: "removed" },
    },
  });
  if (!existing) return null;

  const row = await prisma.eventPlant.update({
    where: { id: existing.id },
    data: {
      quantityPurchased: existing.quantityPurchased + qty,
      updatedById: input.actorUserId ?? null,
    },
    include: {
      eventVendor: { select: { vendorName: true } },
      assignments: { include: { roundInstance: true } },
    },
  });

  await writeEventAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "plant.quantity_changed",
    entityType: "event_plant",
    entityId: row.id.toString(),
    metadata: { eventId: input.eventId.toString(), added: qty },
  });

  const reqCount = await prisma.eventPlantRequest.count({ where: { eventPlantId: row.id } });
  return serializePlant(row, reqCount, { score: reqCount * 10, label: "Current Event Demand" });
}

export async function assignPlantToGame(input: {
  organizationId: bigint;
  eventId: bigint;
  plantId: bigint;
  roundInstanceId: string;
  quantity?: number;
  actorUserId?: bigint;
}): Promise<EventPlantAssignmentDto | null> {
  const qty = clampNonNegative(input.quantity ?? 1);
  if (qty <= 0) throw new Error("Quantity must be positive.");

  const [plant, round] = await Promise.all([
    prisma.eventPlant.findFirst({
      where: {
        id: input.plantId,
        organizationId: input.organizationId,
        eventId: input.eventId,
        status: { not: "removed" },
      },
    }),
    prisma.eventBingoRoundInstance.findFirst({
      where: { id: BigInt(input.roundInstanceId), organizationId: input.organizationId, eventId: input.eventId },
    }),
  ]);
  if (!plant || !round) return null;

  if (plant.quantityAssigned + qty > plant.quantityPurchased - plant.quantityRemoved) {
    throw new Error("Cannot assign more plants than available inventory.");
  }

  const assignment = await prisma.$transaction(async (tx) => {
    const created = await tx.eventPlantAssignment.create({
      data: {
        organizationId: input.organizationId,
        eventId: input.eventId,
        eventPlantId: plant.id,
        roundInstanceId: round.id,
        bingoGameId: round.bingoGameId,
        quantity: qty,
        status: "assigned",
        assignedById: input.actorUserId ?? null,
      },
    });
    await tx.eventPlant.update({
      where: { id: plant.id },
      data: { quantityAssigned: plant.quantityAssigned + qty, updatedById: input.actorUserId ?? null },
    });
    await tx.eventBingoRoundInstance.update({
      where: { id: round.id },
      data: { assignedPrize: plant.name },
    });
    return created;
  });

  await writeEventAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "plant.assigned",
    entityType: "event_plant_assignment",
    entityId: assignment.id.toString(),
    metadata: { eventId: input.eventId.toString(), plantId: plant.id.toString() },
  });

  return {
    id: assignment.id.toString(),
    eventPlantId: plant.id.toString(),
    plantName: plant.name,
    roundInstanceId: round.id.toString(),
    roundNumber: round.roundNumber,
    roundName: round.name,
    bingoGameId: round.bingoGameId?.toString() ?? null,
    quantity: qty,
    status: "assigned",
    assignedAt: assignment.assignedAt.toISOString(),
  };
}

export async function removePlantAssignment(input: {
  organizationId: bigint;
  eventId: bigint;
  assignmentId: bigint;
  actorUserId?: bigint;
}): Promise<boolean> {
  const assignment = await prisma.eventPlantAssignment.findFirst({
    where: { id: input.assignmentId, organizationId: input.organizationId, eventId: input.eventId },
    include: { eventPlant: true },
  });
  if (!assignment || assignment.status === "cancelled") return false;

  await prisma.$transaction([
    prisma.eventPlantAssignment.update({
      where: { id: assignment.id },
      data: { status: "cancelled", updatedAt: new Date() },
    }),
    prisma.eventPlant.update({
      where: { id: assignment.eventPlantId },
      data: {
        quantityAssigned: Math.max(0, assignment.eventPlant.quantityAssigned - assignment.quantity),
        updatedById: input.actorUserId ?? null,
      },
    }),
  ]);

  await writeEventAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "plant.assignment_removed",
    entityType: "event_plant_assignment",
    entityId: assignment.id.toString(),
    metadata: { eventId: input.eventId.toString() },
  });

  return true;
}

export async function markPlantsAwarded(input: {
  organizationId: bigint;
  eventId: bigint;
  plantId: bigint;
  quantity: number;
  actorUserId?: bigint;
}): Promise<EventPlantDto | null> {
  const qty = clampNonNegative(input.quantity);
  if (qty <= 0) throw new Error("Quantity must be positive.");

  const plant = await prisma.eventPlant.findFirst({
    where: {
      id: input.plantId,
      organizationId: input.organizationId,
      eventId: input.eventId,
      status: { not: "removed" },
    },
  });
  if (!plant) return null;

  const maxAward = plant.quantityPurchased - plant.quantityRemoved;
  const row = await prisma.eventPlant.update({
    where: { id: plant.id },
    data: {
      quantityAwarded: Math.min(maxAward, plant.quantityAwarded + qty),
      updatedById: input.actorUserId ?? null,
    },
    include: {
      eventVendor: { select: { vendorName: true } },
      assignments: { include: { roundInstance: true } },
    },
  });

  await writeEventAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "plant.awarded",
    entityType: "event_plant",
    entityId: row.id.toString(),
    metadata: { eventId: input.eventId.toString(), quantity: qty },
  });

  const reqCount = await prisma.eventPlantRequest.count({ where: { eventPlantId: row.id } });
  return serializePlant(row, reqCount, { score: reqCount * 10, label: "Current Event Demand" });
}

export async function removePlantFromEvent(input: {
  organizationId: bigint;
  eventId: bigint;
  plantId: bigint;
  actorUserId?: bigint;
}): Promise<boolean> {
  const plant = await prisma.eventPlant.findFirst({
    where: { id: input.plantId, organizationId: input.organizationId, eventId: input.eventId },
  });
  if (!plant) return false;

  await prisma.eventPlant.update({
    where: { id: plant.id },
    data: { status: "removed", updatedById: input.actorUserId ?? null },
  });

  await writeEventAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "plant.removed",
    entityType: "event_plant",
    entityId: plant.id.toString(),
    metadata: { eventId: input.eventId.toString() },
  });

  return true;
}

export async function duplicateEventPlant(input: {
  organizationId: bigint;
  eventId: bigint;
  plantId: bigint;
  actorUserId?: bigint;
}): Promise<EventPlantDto | null> {
  const plant = await prisma.eventPlant.findFirst({
    where: { id: input.plantId, organizationId: input.organizationId, eventId: input.eventId },
  });
  if (!plant) return null;

  return createEventPlant({
    organizationId: input.organizationId,
    eventId: input.eventId,
    actorUserId: input.actorUserId,
    data: {
      name: `${plant.name} (copy)`,
      category: plant.category,
      variety: plant.variety,
      description: plant.description,
      imageUrl: plant.imageUrl,
      eventVendorId: plant.eventVendorId?.toString() ?? null,
      posProductId: plant.posProductId?.toString() ?? null,
      unitCost: num(plant.unitCost),
      retailValue: plant.retailValue != null ? num(plant.retailValue) : null,
      notes: plant.notes,
    },
  });
}

export async function createPlantRequest(input: {
  organizationId: bigint;
  eventId: bigint;
  data: CreatePlantRequestInput;
  actorUserId?: bigint;
}): Promise<EventPlantRequestDto | { error: string }> {
  let registrationId: bigint;
  try {
    registrationId = BigInt(input.data.registrationId);
  } catch {
    return { error: "Invalid registration." };
  }

  const registration = await prisma.lmsEventRegistration.findFirst({
    where: { id: registrationId, organizationId: input.organizationId, eventId: input.eventId },
  });
  if (!registration) return { error: "Registration not found for this event." };

  let eventPlantId: bigint | null = null;
  let plantName = input.data.requestedPlantName?.trim() || null;

  if (input.data.eventPlantId) {
    try {
      const pid = BigInt(input.data.eventPlantId);
      const plant = await prisma.eventPlant.findFirst({
        where: { id: pid, organizationId: input.organizationId, eventId: input.eventId, status: { not: "removed" } },
      });
      if (!plant) return { error: "Plant not found." };
      eventPlantId = pid;
      plantName = plant.name;
    } catch {
      return { error: "Invalid plant." };
    }
  }

  if (!eventPlantId && !plantName) {
    return { error: "Select a plant or enter a requested plant name." };
  }

  const dupWhere: Prisma.EventPlantRequestWhereInput = {
    organizationId: input.organizationId,
    eventId: input.eventId,
    registrationId,
  };
  if (eventPlantId) dupWhere.eventPlantId = eventPlantId;
  else if (plantName) dupWhere.requestedPlantName = { equals: plantName, mode: "insensitive" };

  const dup = await prisma.eventPlantRequest.findFirst({ where: dupWhere });
  if (dup) return { error: "This attendee already has a request for this plant." };

  const row = await prisma.eventPlantRequest.create({
    data: {
      organizationId: input.organizationId,
      eventId: input.eventId,
      registrationId,
      eventPlantId,
      requestedPlantName: plantName,
      priority: input.data.priority ?? 1,
      notes: input.data.notes?.trim() || null,
    },
    include: {
      registration: { select: { attendeeName: true, attendeeEmail: true } },
      eventPlant: { select: { name: true } },
    },
  });

  await writeEventAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "plant_request.added",
    entityType: "event_plant_request",
    entityId: row.id.toString(),
    metadata: { eventId: input.eventId.toString() },
  });

  return {
    id: row.id.toString(),
    eventId: row.eventId.toString(),
    registrationId: row.registrationId.toString(),
    attendeeName: row.registration.attendeeName,
    attendeeEmail: row.registration.attendeeEmail,
    eventPlantId: row.eventPlantId?.toString() ?? null,
    plantName: row.eventPlant?.name ?? row.requestedPlantName ?? "—",
    priority: row.priority,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

export function eventPlantsToCsv(plants: EventPlantDto[]): string {
  const headers = [
    "Name",
    "Category",
    "Variety",
    "Supplier",
    "Qty Purchased",
    "Qty Assigned",
    "Qty Awarded",
    "Qty Remaining",
    "Unit Cost",
    "Total Cost",
    "Retail Value",
    "Requests",
    "Status",
  ];
  const lines = [headers.join(",")];
  for (const p of plants.filter((x) => x.status !== "removed")) {
    lines.push(
      [
        csvCell(p.name),
        csvCell(p.category ?? ""),
        csvCell(p.variety ?? ""),
        csvCell(p.supplierName ?? ""),
        String(p.quantityPurchased),
        String(p.quantityAssigned),
        String(p.quantityAwarded),
        String(p.quantityRemaining),
        String(p.unitCost),
        String(p.totalCost),
        p.retailValue != null ? String(p.retailValue) : "",
        String(p.requestCount),
        p.status,
      ].join(","),
    );
  }
  return lines.join("\n");
}

export function plantRequestsToCsv(requests: EventPlantRequestDto[]): string {
  const headers = ["Attendee", "Email", "Plant", "Priority", "Notes", "Requested At"];
  const lines = [headers.join(",")];
  for (const r of requests) {
    lines.push(
      [
        csvCell(r.attendeeName),
        csvCell(r.attendeeEmail),
        csvCell(r.plantName),
        r.priority != null ? String(r.priority) : "",
        csvCell(r.notes ?? ""),
        r.createdAt,
      ].join(","),
    );
  }
  return lines.join("\n");
}

function csvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function importPlantsFromCsv(input: {
  organizationId: bigint;
  eventId: bigint;
  csv: string;
  actorUserId?: bigint;
}): Promise<{ created: number; errors: string[] }> {
  const lines = input.csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { created: 0, errors: ["CSV must include a header row and at least one plant."] };

  const errors: string[] = [];
  let created = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = cols[0]?.trim();
    if (!name) {
      errors.push(`Row ${i + 1}: name is required.`);
      continue;
    }
    const plant = await createEventPlant({
      organizationId: input.organizationId,
      eventId: input.eventId,
      actorUserId: input.actorUserId,
      data: {
        name,
        category: cols[1]?.trim() || null,
        variety: cols[2]?.trim() || null,
        quantityPurchased: Number.parseInt(cols[3] ?? "0", 10) || 0,
        unitCost: Number.parseFloat(cols[4] ?? "0") || 0,
        retailValue: cols[5] ? Number.parseFloat(cols[5]) : null,
      },
    });
    if (plant) created += 1;
    else errors.push(`Row ${i + 1}: could not create plant.`);
  }

  return { created, errors };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') inQuotes = false;
      else current += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      result.push(current);
      current = "";
    } else current += ch;
  }
  result.push(current);
  return result;
}

export async function seedPlantsFromBingoRounds(
  organizationId: bigint,
  eventId: bigint,
  actorUserId?: bigint,
): Promise<number> {
  const rounds = await prisma.eventBingoRoundInstance.findMany({
    where: { organizationId, eventId },
    select: { assignedPrize: true },
  });
  const existing = await prisma.eventPlant.findMany({
    where: { organizationId, eventId, status: { not: "removed" } },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((p) => plantKey(p.name)));
  let created = 0;

  for (const round of rounds) {
    const prize = round.assignedPrize?.trim();
    if (!prize || existingNames.has(plantKey(prize))) continue;
    const plant = await createEventPlant({
      organizationId,
      eventId,
      actorUserId,
      data: { name: prize, category: "Prize plant", quantityPurchased: 1 },
    });
    if (plant) {
      existingNames.add(plantKey(prize));
      created += 1;
    }
  }
  return created;
}

export async function getPlantInventoryReady(
  organizationId: bigint,
  eventId: bigint,
  registrationCount: number,
): Promise<{ ready: boolean; totalRemaining: number; gapCount: number }> {
  const plants = await prisma.eventPlant.findMany({
    where: { organizationId, eventId, status: { not: "removed" } },
  });
  if (!plants.length) return { ready: false, totalRemaining: 0, gapCount: 0 };

  const totalRemaining = plants.reduce((s, p) => s + quantityRemaining(p), 0);
  const requests = await prisma.eventPlantRequest.count({ where: { organizationId, eventId } });
  const gapCount = Math.max(0, requests + registrationCount - totalRemaining);
  return { ready: totalRemaining >= registrationCount && gapCount === 0, totalRemaining, gapCount };
}

